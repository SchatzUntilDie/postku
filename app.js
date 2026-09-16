const db = window.postkuSupabase;
const PLACEHOLDER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="460"><rect width="100%" height="100%" fill="#eef2f7"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="Arial" font-size="28">POSTKU</text></svg>'
);
let S = {
  products: [], orders: [], cart: [],
  settings: {shopName:"POSTKU",shopAddress:"",shopPhone:"",bankName:"",bankAccount:"",bankOwner:"",qris:"",paperSize:"58"},
  buyerName:"", tableNo:""
};
let current = null, activeCat="Semua", orderFilter="all", chartResizeObservers=[];
let realtimeChannel = null;

const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const placeholder = () => PLACEHOLDER;
const toast = t => { const x=document.getElementById("toast"); if(!x)return; x.textContent=t; x.classList.add("show"); setTimeout(()=>x.classList.remove("show"),1800); };
const isAdmin = () => current?.role==="admin";
const todayKey = (d=new Date()) => d.toISOString().slice(0,10);

function localSave(){
  try { localStorage.setItem("postku_cart", JSON.stringify({cart:S.cart,buyerName:S.buyerName,tableNo:S.tableNo})); } catch {}
}
function localLoad(){
  try { const x=JSON.parse(localStorage.getItem("postku_cart")||"{}"); S.cart=Array.isArray(x.cart)?x.cart:[]; S.buyerName=x.buyerName||""; S.tableNo=x.tableNo||""; } catch {}
}
function clearLocalCart(){S.cart=[];S.buyerName="";S.tableNo="";localSave();}

async function loadSettings(){
  const {data,error}=await db.from("store_settings").select("*").eq("id",1).maybeSingle();
  if(error){console.warn(error);return;}
  if(data) S.settings={...S.settings,shopName:data.store_name||"POSTKU",bankName:data.bank_name||"",bankOwner:data.bank_account_name||"",bankAccount:data.bank_account_number||"",qris:data.qris_image_url||""};
}
async function loadProducts(){
  const {data,error}=await db.from("products").select("id,name,category,price,image_url,is_active,sku,stock,unit,product_variants(id,name,sku,price,stock,is_active)").eq("is_active",true).order("name").limit(500);
  if(error){toast("Gagal memuat produk: "+error.message);console.error(error);return;}
  S.products=(data||[]).map(p=>({...p,cat:p.category||"Lainnya",img:p.image_url||"",variants:(p.product_variants||[]).filter(v=>v.is_active).map(v=>({...v,price:v.price==null?Number(p.price):Number(v.price)}))}));
}
async function loadOrders(){
  const {data,error}=await db.from("orders").select("id,order_number,customer_name,status,total,discount,notes,created_at,completed_at,cashier_id,order_items(id,product_id,variant_id,variant_name,product_name,quantity,unit_price,subtotal),payments(method,amount,status,reference,account_name,bank_name,paid_at)").order("created_at",{ascending:false}).limit(100);
  if(error){toast("Gagal memuat transaksi");console.error(error);return;}
  S.orders=(data||[]).map(o=>{
    const pay=(o.payments||[])[0];
    return {id:o.id,number:o.order_number,displayId:"ORD-"+String(o.order_number),date:o.created_at,buyer:o.customer_name||"Umum",
      status:o.status==="completed"?"paid":o.status, total:Number(o.total)||0, discount:Number(o.discount)||0,
      cashier:o.cashier_id===current?.id?(current.username||current.display_name||"Kasir"):"Kasir",
      cashier_id:o.cashier_id, items:(o.order_items||[]).map(i=>({id:i.product_id,variant_id:i.variant_id||null,variant_name:i.variant_name||null,name:i.product_name,price:Number(i.unit_price)||0,qty:i.quantity})),
      method:pay?({cash:"Tunai",qris:"QRIS",transfer:"Transfer"}[pay.method]||pay.method):"-",
      cash:pay?.method==="cash"?Number(pay.amount)||0:0, change:0, payment:pay};
  });
}
async function refreshData(){ await Promise.all([loadSettings(),loadProducts(),loadOrders()]); }

function setupRealtime(){
  if(!current)return;
  if(realtimeChannel){ try{ db.removeChannel(realtimeChannel); }catch{} realtimeChannel=null; }
  realtimeChannel=db.channel("postku-live-data")
    .on("postgres_changes",{event:"*",schema:"public",table:"products"},async()=>{ await loadProducts(); if(!document.getElementById("view-products")?.classList.contains("hidden"))renderProducts(); if(!document.getElementById("view-kasir")?.classList.contains("hidden"))renderKasir(); renderDashboard(); })
    .on("postgres_changes",{event:"*",schema:"public",table:"product_variants"},async()=>{ await loadProducts(); if(!document.getElementById("view-products")?.classList.contains("hidden"))renderProducts(); if(!document.getElementById("view-kasir")?.classList.contains("hidden"))renderKasir(); renderDashboard(); })
    .on("postgres_changes",{event:"*",schema:"public",table:"orders"},async()=>{ await loadOrders(); if(!document.getElementById("view-orders")?.classList.contains("hidden"))renderOrders(); renderDashboard(); if(!document.getElementById("view-reports")?.classList.contains("hidden"))renderReports(); })
    .subscribe();
}

async function login(){
  const username=document.getElementById("loginUser").value.trim();
  const password=document.getElementById("loginPass").value;
  const btn=document.getElementById("loginBtn");
  if(!username||!password){document.getElementById("loginError").textContent="Username dan password wajib diisi.";return;}
  btn.disabled=true; document.getElementById("loginError").textContent="";
  try{
    const {data,error}=await fetch(`${window.POSTKU_SUPABASE_URL}/functions/v1/postku-login`,{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})
    }).then(async r=>({data:await r.json(),error:r.ok?null:new Error((await Promise.resolve({}))).message})).catch(e=>({error:e}));
    if(error || !data?.session){document.getElementById("loginError").textContent=data?.error||"Login gagal. Periksa koneksi.";return;}
    const {error:setErr}=await db.auth.setSession(data.session);
    if(setErr) throw setErr;
    current={...data.profile,id:data.profile.id};
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("mainScreen").classList.remove("hidden");
    document.getElementById("currentUser").textContent=`${current.username||current.display_name||"User"} · ${current.role==="admin"?"Admin":"Kasir"}`;
    document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!isAdmin()));
    localLoad(); await refreshData(); setupRealtime(); go("dashboard");
  }catch(e){console.error(e);document.getElementById("loginError").textContent="Tidak dapat terhubung ke server."}
  finally{btn.disabled=false}
}
async function restoreSession(){
  const {data}=await db.auth.getSession();
  if(!data.session)return false;
  const {data:p,error}=await db.from("profiles").select("id,username,display_name,role").eq("id",data.session.user.id).single();
  if(error||!p)return false;
  current=p;
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("mainScreen").classList.remove("hidden");
  document.getElementById("currentUser").textContent=`${p.username||p.display_name||"User"} · ${p.role==="admin"?"Admin":"Kasir"}`;
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!isAdmin()));
  localLoad(); await refreshData(); setupRealtime(); go("dashboard"); return true;
}
async function logout(){if(realtimeChannel){try{await db.removeChannel(realtimeChannel)}catch{} realtimeChannel=null;}await db.auth.signOut();current=null;clearLocalCart();document.getElementById("mainScreen").classList.add("hidden");document.getElementById("loginScreen").classList.remove("hidden");document.getElementById("loginPass").value="";}

function go(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  document.getElementById("view-"+name)?.classList.remove("hidden");
  document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.nav===name));
  const titles={dashboard:"Dashboard",kasir:"Kasir",orders:"Pesanan",products:"Produk",reports:"Laporan",settings:"Pengaturan"};
  document.getElementById("pageTitle").textContent=titles[name]||"POSTKU";
  if(name==="dashboard")renderDashboard();
  if(name==="kasir")renderKasir();
  if(name==="orders")renderOrders();
  if(name==="products")renderProducts();
  if(name==="reports")renderReports();
  if(name==="settings")renderSettings();
}

function completedOrders(){return S.orders.filter(o=>o.status==="paid");}
function renderDashboard(){
  const today=todayKey(),done=completedOrders().filter(o=>o.date.slice(0,10)===today);
  document.getElementById("statOmzet").textContent=rupiah(done.reduce((a,o)=>a+o.total,0));
  document.getElementById("statTx").textContent=done.length;
  document.getElementById("statPending").textContent=S.orders.filter(o=>o.status==="pending").length;
  document.getElementById("statProducts").textContent=S.products.length;
  const period=+(document.getElementById("salesPeriod")?.value||7);
  drawChart(document.getElementById("salesChart"),period); watchChartResize(document.getElementById("salesChart"),period);
  const counts={}; done.forEach(o=>o.items.forEach(i=>counts[i.name]=(counts[i.name]||0)+i.qty));
  document.getElementById("topProducts").innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n,q])=>`<div class="rank-row"><span>${esc(n)}</span><b>${q}</b></div>`).join("")||'<div class="muted">Belum ada penjualan.</div>';
}
function chartBuckets(period){
  const now=new Date(), arr=[];
  if(period===1){for(let i=23;i>=0;i--){const d=new Date(now);d.setMinutes(0,0,0);d.setHours(d.getHours()-i);arr.push({key:d.toISOString().slice(0,13),label:String(d.getHours()).padStart(2,"0")+":00",sum:0});}}
  else if(period<=30){for(let i=period-1;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);arr.push({key:d.toISOString().slice(0,10),label:d.toLocaleDateString("id-ID",{day:"2-digit",month:"short"}),sum:0});}}
  else if(period===90){for(let i=12;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i*7);arr.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-W${Math.ceil(d.getDate()/7)}`,label:d.toLocaleDateString("id-ID",{day:"2-digit",month:"short"}),sum:0});}}
  else {for(let i=11;i>=0;i--){const d=new Date(now);d.setDate(1);d.setMonth(d.getMonth()-i);arr.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("id-ID",{month:"short",year:"2-digit"}),sum:0});}}
  return arr;
}
function drawChart(canvas,period){
  if(!canvas)return; const rect=canvas.parentElement.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
  const w=Math.max(260,Math.floor(rect.width)),h=220; canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width="100%";canvas.style.height=h+"px";
  const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const buckets=chartBuckets(period), done=completedOrders();
  done.forEach(o=>{const d=new Date(o.date);let key;
    if(period===1)key=d.toISOString().slice(0,13);
    else if(period<=30)key=d.toISOString().slice(0,10);
    else if(period===90){const x=new Date(d);x.setDate(x.getDate()-x.getDay());key=`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-W${Math.ceil(x.getDate()/7)}`;}
    else key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const b=buckets.find(x=>x.key===key);if(b)b.sum+=o.total;
  });
  const max=Math.max(1,...buckets.map(x=>x.sum)), pad={l:46,r:12,t:12,b:34}, cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
  ctx.strokeStyle="#e5eaf1";ctx.fillStyle="#64748b";ctx.font="11px system-ui";ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=pad.t+ch*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(rupiah(max*(1-i/4)).replace("Rp",""),4,y+4);}
  ctx.strokeStyle="#2563eb";ctx.lineWidth=3;ctx.beginPath();
  buckets.forEach((b,i)=>{const x=pad.l+(buckets.length===1?cw/2:cw*i/(buckets.length-1)),y=pad.t+ch-(b.sum/max)*ch;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  ctx.stroke();ctx.fillStyle="#2563eb";
  buckets.forEach((b,i)=>{const x=pad.l+(buckets.length===1?cw/2:cw*i/(buckets.length-1)),y=pad.t+ch-(b.sum/max)*ch;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();if(i%Math.ceil(buckets.length/6)===0){ctx.fillStyle="#64748b";ctx.fillText(b.label,x-18,h-10);ctx.fillStyle="#2563eb";}});
}
function watchChartResize(canvas,period){if(!canvas||canvas._ro)return;const ro=new ResizeObserver(()=>requestAnimationFrame(()=>drawChart(canvas,+canvas.dataset.period||period)));ro.observe(canvas.parentElement);canvas._ro=ro;}

function renderKasir(){
  const cats=["Semua",...new Set(S.products.map(p=>p.cat))];
  document.getElementById("categoryBar").innerHTML=cats.map(c=>`<button class="chip ${activeCat===c?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  const q=document.getElementById("productSearch").value.toLowerCase();
  const list=S.products.filter(p=>(activeCat==="Semua"||p.cat===activeCat)&&p.name.toLowerCase().includes(q));
  document.getElementById("productGrid").innerHTML=list.map(p=>`<button class="product-card" data-add="${p.id}"><img loading="lazy" class="product-photo" src="${esc(p.img||placeholder())}" onerror="this.src='${placeholder()}'"><div class="product-info"><div class="product-name">${esc(p.name)}</div><div class="product-price">${p.variants?.length?`${p.variants.length} varian`:rupiah(p.price)}</div></div></button>`).join("")||'<div class="panel muted">Produk tidak ditemukan.</div>';
  document.getElementById("buyerName").value=S.buyerName||"";document.getElementById("tableNo").value=S.tableNo||"";renderCart();
}
function chooseVariant(productId){
  const p=S.products.find(x=>String(x.id)===String(productId));if(!p)return;
  if(!p.variants?.length){addToCart(productId,null);return}
  openModal(`<h2>${esc(p.name)}</h2><p class="muted">Pilih rasa / varian</p><div class="variant-choices">${p.variants.map(v=>`<button class="variant-choice" data-variant="${v.id}"><span><b>${esc(v.name)}</b><small>Stok ${Number(v.stock)||0}</small></span><strong>${rupiah(v.price)}</strong></button>`).join("")}</div>`);
  document.querySelectorAll("[data-variant]").forEach(b=>b.onclick=()=>{addToCart(p.id,b.dataset.variant);closeModal()});
}
function addToCart(id,variantId=null){
  const p=S.products.find(x=>String(x.id)===String(id));if(!p)return;const v=variantId?p.variants.find(x=>String(x.id)===String(variantId)):null;
  if(v&&v.stock<=0){toast("Varian sedang habis");return}
  const key=variantId?`${id}:${variantId}`:`${id}:base`,i=S.cart.find(x=>x.key===key);
  if(i){if(v&&i.qty>=v.stock){toast("Stok varian tidak cukup");return}i.qty++}
  else S.cart.push({key,id:p.id,variant_id:v?.id||null,variant_name:v?.name||null,name:p.name,price:Number(v?.price??p.price),qty:1,maxStock:v?.stock??null});
  localSave();renderCart();
}
function renderCart(){
  document.getElementById("cartItems").innerHTML=S.cart.map(i=>`<div class="cart-row"><div class="grow"><b>${esc(i.name)}${i.variant_name?` — ${esc(i.variant_name)}`:""}</b><small>${rupiah(i.price)} × ${i.qty}</small></div><div class="qty"><button data-minus="${esc(i.key)}">−</button><b>${i.qty}</b><button data-plus="${esc(i.key)}">+</button></div></div>`).join("")||'<div class="empty muted">Keranjang kosong.</div>';
  document.getElementById("cartCount").textContent=`${S.cart.reduce((a,i)=>a+i.qty,0)} item`;document.getElementById("cartTotal").textContent=rupiah(cartTotal());
}
function cartTotal(){return S.cart.reduce((a,i)=>a+i.price*i.qty,0);}
function clearCart(){clearLocalCart();renderCart();}
function openCheckout(){
  if(!S.cart.length){toast("Keranjang masih kosong");return}
  const total=cartTotal();
  openModal(`<h2>Bayar</h2><p class="muted">${esc(S.buyerName||"Umum")} · Total <b>${rupiah(total)}</b></p><div class="pay-grid"><button class="secondary" data-pay="cash">💵 Tunai</button><button class="secondary" data-pay="qris">▣ QRIS</button><button class="secondary" data-pay="transfer">🏦 Transfer</button></div><div id="payFields"></div>`);
  document.querySelectorAll("[data-pay]").forEach(b=>b.onclick=()=>selectPayment(b.dataset.pay,total));
}
function selectPayment(method,total){
  const f=document.getElementById("payFields");
  if(method==="cash")f.innerHTML=`<div class="field"><label>Uang diterima</label><input id="cashAmount" type="number" min="${total}" value="${total}"></div><button class="primary" style="width:100%" id="confirmPay">Simpan & Cetak</button>`;
  else if(method==="qris")f.innerHTML=`<div class="panel"><b>QRIS</b><img class="qris-preview" src="${esc(S.settings.qris||placeholder())}"><p class="muted">Pastikan pembayaran sudah diterima.</p></div><button class="primary" style="width:100%" id="confirmPay">Konfirmasi & Cetak</button>`;
  else f.innerHTML=`<div class="panel"><b>Transfer</b><p>${esc(S.settings.bankName||"Bank belum diatur")}</p><p>${esc(S.settings.bankAccount||"No. rekening belum diatur")} · ${esc(S.settings.bankOwner||"")}</p></div><div class="field"><label>Referensi transfer (opsional)</label><input id="payRef"></div><button class="primary" style="width:100%" id="confirmPay">Konfirmasi & Cetak</button>`;
  document.getElementById("confirmPay").onclick=()=>finishPayment(method,total);
}
async function finishPayment(method,total){
  const cash=method==="cash"?Number(document.getElementById("cashAmount").value):total;
  if(method==="cash"&&cash<total){toast("Uang diterima kurang");return}
  const now=new Date();
  const orderPayload={customer_name:document.getElementById("payBuyer")?.value?.trim()||S.buyerName||"Umum",status:"completed",total,discount:0,cashier_id:current.id,completed_at:now.toISOString(),created_at:now.toISOString()};
  const {data:order,error}=await db.from("orders").insert(orderPayload).select("id,order_number,created_at").single();
  if(error){console.error(error);toast("Gagal menyimpan transaksi");return;}
  const items=S.cart.map(i=>({order_id:order.id,product_id:i.id,variant_id:i.variant_id||null,variant_name:i.variant_name||null,product_name:i.name,quantity:i.qty,unit_price:i.price,subtotal:i.price*i.qty}));
  const {error:ie}=await db.from("order_items").insert(items);
  if(ie){console.error(ie);await db.from("orders").delete().eq("id",order.id);toast("Detail transaksi gagal disimpan");return;}
  const payment={order_id:order.id,method,amount:cash,status:"paid",reference:method==="transfer"?(document.getElementById("payRef")?.value||null):null,paid_at:now.toISOString()};
  const {error:pe}=await db.from("payments").insert(payment);
  if(pe){console.error(pe);toast("Pembayaran gagal disimpan");return;}
  const local={id:order.id,number:order.order_number,displayId:"ORD-"+order.order_number,date:order.created_at,buyer:orderPayload.customer_name,items:structuredClone(S.cart),total,method:({cash:"Tunai",qris:"QRIS",transfer:"Transfer"})[method],cash,change:Math.max(0,cash-total),status:"paid",cashier:current.username};
  clearLocalCart();closeModal();await loadOrders();go("orders");setTimeout(()=>printReceipt(local),250);toast("Transaksi berhasil");
}
async function createPending(){
  if(!S.cart.length){toast("Keranjang masih kosong");return}
  const {data:order,error}=await db.from("orders").insert({customer_name:S.buyerName||"Umum",status:"pending",total:cartTotal(),cashier_id:current.id}).select("id,order_number,created_at").single();
  if(error){console.error(error);toast("Gagal membuat pending");return;}
  const {error:ie}=await db.from("order_items").insert(S.cart.map(i=>({order_id:order.id,product_id:i.id,variant_id:i.variant_id||null,variant_name:i.variant_name||null,product_name:i.name,quantity:i.qty,unit_price:i.price,subtotal:i.price*i.qty})));
  if(ie){console.error(ie);toast("Gagal menyimpan item pending");return;}
  clearLocalCart();await loadOrders();go("orders");toast("Pesanan disimpan sebagai pending");
}
function renderOrders(){
  const arr=S.orders.filter(o=>orderFilter==="all"||o.status===orderFilter);
  document.getElementById("ordersList").innerHTML=arr.map(o=>`<div class="order-card"><div class="order-top"><div><b>${esc(o.displayId)}</b><div class="muted">${new Date(o.date).toLocaleString("id-ID")} · ${esc(o.buyer)}</div></div><span class="badge ${o.status}">${o.status==="paid"?"SELESAI":o.status==="pending"?"PENDING":"DIBATALKAN"}</span></div><div class="order-items">${o.items.map(i=>`${i.qty}× ${esc(i.name)}`).join(" · ")}</div><div><b>${rupiah(o.total)}</b> ${o.method!=="-"?`· ${esc(o.method)}`:""}</div><div class="order-actions" style="margin-top:12px">${o.status==="pending"?`<button class="primary" data-resume="${o.id}">Lanjutkan & Bayar</button><button class="secondary" data-cancel="${o.id}">Batalkan</button>`:""}${o.status==="paid"?`<button class="secondary" data-reprint="${o.id}">Cetak Ulang</button>${isAdmin()?`<button class="secondary" data-void="${o.id}">Void</button>`:""}`:""}</div></div>`).join("")||'<div class="panel muted">Belum ada pesanan.</div>';
}
async function resumeOrder(id){
  const o=S.orders.find(x=>x.id===id);if(!o)return;
  S.cart=structuredClone(o.items);S.buyerName=o.buyer;S.tableNo="";localSave();
  await db.from("orders").update({status:"cancelled",cancel_reason:"Dipindahkan kembali ke kasir"}).eq("id",id);
  await loadOrders();go("kasir");toast("Pesanan dikembalikan ke keranjang");
}
async function cancelOrder(id){
  const o=S.orders.find(x=>x.id===id);if(!o)return;
  const {error}=await db.from("orders").update({status:"cancelled",cancelled_at:new Date().toISOString(),cancel_reason:"Dibatalkan kasir"}).eq("id",id);
  if(error){toast("Gagal membatalkan");return} await loadOrders();renderOrders();toast("Pesanan dibatalkan");
}
async function voidOrder(id){
  if(!isAdmin()){toast("Hanya Admin");return}
  const {error}=await db.from("orders").update({status:"cancelled",cancelled_at:new Date().toISOString(),cancel_reason:"Void oleh admin"}).eq("id",id);
  if(error){toast("Gagal void");return} await loadOrders();renderOrders();toast("Transaksi di-void");
}
function renderProducts(){
  document.getElementById("productsList").innerHTML=S.products.map(p=>{const vars=p.variants||[];return `<div class="admin-product"><img loading="lazy" src="${esc(p.img||placeholder())}" onerror="this.src='${placeholder()}'"><div class="grow"><b>${esc(p.name)}</b><div class="muted">${esc(p.cat)} · ${vars.length?vars.map(v=>`${esc(v.name)} (${v.stock})`).join(" · "):rupiah(p.price)}</div></div><button class="secondary" data-edit="${p.id}">Edit</button><button class="secondary" data-delete="${p.id}">Hapus</button></div>`}).join("")||'<div class="panel muted">Belum ada produk.</div>';
}
async function prepareProductImage(file){
  if(!file)return null;
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error("Format foto harus JPG, PNG, atau WebP.");
  if(file.size<=900*1024)return file;
  const bmp=await createImageBitmap(file);
  const max=1200,scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const c=document.createElement("canvas");c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);bmp.close?.();
  const blob=await new Promise((resolve,reject)=>c.toBlob(resolve,"image/jpeg",0.82));
  if(!blob)throw new Error("Foto tidak dapat diproses di perangkat ini.");
  return new File([blob],"product.jpg",{type:"image/jpeg",lastModified:Date.now()});
}
async function uploadProductImage(file){
  const prepared=await prepareProductImage(file);
  const ext=(prepared.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";const path=`${current.id}/${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from("product-images").upload(path,prepared,{upsert:false,contentType:prepared.type,cacheControl:"86400"});if(error)throw new Error("Upload foto: "+error.message);
  return db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
function productModal(id=null){
  const p=id?S.products.find(x=>String(x.id)===String(id)):{name:"",price:0,cat:"Makanan",img:"",stock:0,sku:"",variants:[]};
  let variants=(p.variants||[]).map(v=>({id:v.id,name:v.name,price:v.price,stock:v.stock,sku:v.sku||""}));
  let removeImage=false;
  const rows=()=>variants.map((v,i)=>`<div class="variant-edit-row" data-vrow="${i}">
    <div class="variant-field"><label>Nama / rasa</label><input class="v-name" value="${esc(v.name)}" placeholder="Contoh: Matcha"></div>
    <div class="variant-field"><label>Harga</label><input class="v-price" type="number" min="0" value="${v.price??p.price??0}" inputmode="numeric" placeholder="10000"></div>
    <div class="variant-field"><label>Stok</label><input class="v-stock" type="number" min="0" value="${v.stock??0}" inputmode="numeric" placeholder="10"></div>
    <div class="variant-field"><label>SKU <span class="muted">opsional</span></label><input class="v-sku" value="${esc(v.sku||"")}" placeholder="RSL-MT"></div>
    <button type="button" class="danger-btn" data-remove-v="${i}" aria-label="Hapus varian">×</button>
  </div>`).join("");
  openModal(`<h2>${id?"Edit Produk":"Tambah Produk"}</h2>
    <div class="field"><label>Nama produk</label><input id="pName" value="${esc(p.name)}" placeholder="Contoh: Risol"></div>
    <div class="field"><label>Kategori</label><input id="pCat" value="${esc(p.cat)}" placeholder="Makanan"></div>
    <div class="field"><label>Harga dasar <span class="muted">(dipakai jika tidak ada varian)</span></label><input id="pPrice" type="number" min="0" value="${p.price||0}" inputmode="numeric"></div>
    <div class="field"><label>Stok dasar <span class="muted">(dipakai jika tidak ada varian)</span></label><input id="pStock" type="number" min="0" value="${p.stock||0}" inputmode="numeric"></div>
    <div class="field"><label>SKU dasar <span class="muted">(opsional)</span></label><input id="pSku" value="${esc(p.sku||"")}" placeholder="RSL"></div>
    <div class="field"><label>Foto produk <span class="muted">JPG/PNG/WebP · otomatis diperkecil bila perlu</span></label><input id="pFile" type="file" accept="image/jpeg,image/png,image/webp"><div class="photo-actions"><button type="button" class="secondary" id="replacePhoto">Ganti Foto</button>${p.img?'<button type="button" class="secondary" id="removePhoto">Hapus Foto</button>':''}</div><img id="pPrev" class="product-modal-preview" src="${esc(p.img||placeholder())}" alt="Preview produk"></div>
    <div class="field variant-section"><div class="variant-head"><div><label>Varian / Rasa</label><small class="muted">Satu produk dapat memiliki banyak varian dengan stok berbeda.</small></div><button type="button" class="secondary" id="addVariantRow">+ Tambah Varian</button></div>
      <div id="variantRows">${rows()}</div><small class="muted">Contoh: Risol → Matcha stok 10, Coklat stok 10.</small>
    </div>
    <button class="primary" style="width:100%" id="saveProduct">Simpan Produk</button>`);
  const redraw=()=>document.getElementById("variantRows").innerHTML=rows();
  const bind=()=>document.querySelectorAll("[data-remove-v]").forEach(b=>b.onclick=()=>{variants.splice(Number(b.dataset.removeV),1);redraw();bind()});
  document.getElementById("addVariantRow").onclick=()=>{variants.push({id:null,name:"",price:Number(p.price)||0,stock:0,sku:""});redraw();bind();setTimeout(()=>document.querySelectorAll('.v-name')[document.querySelectorAll('.v-name').length-1]?.focus(),0)};
  bind();
  document.getElementById("replacePhoto")?.addEventListener("click",()=>document.getElementById("pFile").click());
  document.getElementById("removePhoto")?.addEventListener("click",()=>{removeImage=true;document.getElementById("pFile").value="";document.getElementById("pPrev").src=placeholder();});
  document.getElementById("pFile").onchange=e=>{const f=e.target.files[0];if(!f)return;if(!/^image\/(jpeg|png|webp)$/i.test(f.type)){toast("Gunakan JPG, PNG, atau WebP");e.target.value="";return}removeImage=false;document.getElementById("pPrev").src=URL.createObjectURL(f)};
  document.getElementById("saveProduct").onclick=async()=>{
    const name=document.getElementById("pName").value.trim(),price=Number(document.getElementById("pPrice").value)||0,cat=document.getElementById("pCat").value.trim()||"Lainnya",stock=Number(document.getElementById("pStock").value)||0,sku=document.getElementById("pSku").value.trim()||null,file=document.getElementById("pFile").files[0];
    const rs=[...document.querySelectorAll(".variant-edit-row")].map(row=>{const i=Number(row.dataset.vrow),old=variants[i]||{};const item={name:row.querySelector(".v-name").value.trim(),price:Number(row.querySelector(".v-price").value)||0,stock:Number(row.querySelector(".v-stock").value)||0,sku:row.querySelector(".v-sku").value.trim()||null};if(old.id)item.id=old.id;return item});
    if(!name){toast("Nama produk wajib diisi");return}
    if(rs.some(v=>!v.name)){toast("Nama semua varian wajib diisi");return}
    if(new Set(rs.map(v=>v.name.toLowerCase())).size!==rs.length){toast("Nama varian tidak boleh sama");return}
    const btn=document.getElementById("saveProduct");btn.disabled=true;btn.textContent="Menyimpan…";
    try{
      let image_url=removeImage?null:(p.img||null);if(file)image_url=await uploadProductImage(file);
      const payload={name,price,category:cat,stock,sku,image_url,is_active:true,updated_at:new Date().toISOString()};
      let productId=id;
      if(id){
        // Do not require RETURNING/SELECT here: RLS may allow UPDATE but hide the row from SELECT.
        const result=await db.from("products").update(payload).eq("id",id);
        if(result.error)throw new Error("Produk: "+result.error.message);
        productId=id;
      }else{
        const result=await db.from("products").insert(payload).select("id").single();
        if(result.error)throw new Error("Produk: "+result.error.message);
        productId=result.data.id;
      }
      const existing=(p.variants||[]).map(v=>v.id),keep=rs.filter(v=>v.id).map(v=>v.id),remove=existing.filter(x=>!keep.includes(x));
      if(remove.length){const {error}=await db.from("product_variants").delete().in("id",remove);if(error)throw new Error("Hapus varian: "+error.message)}
      const updates=rs.filter(v=>v.id).map(v=>db.from("product_variants").update({name:v.name,sku:v.sku,price:v.price,stock:v.stock,is_active:true}).eq("id",v.id));
      const updateResults=await Promise.all(updates);const updateError=updateResults.find(r=>r.error);if(updateError?.error)throw new Error("Update varian: "+updateError.error.message);
      const inserts=rs.filter(v=>!v.id).map(v=>({product_id:productId,name:v.name,sku:v.sku,price:v.price,stock:v.stock,is_active:true}));
      if(inserts.length){const {error}=await db.from("product_variants").insert(inserts);if(error)throw new Error("Tambah varian: "+error.message)}
      closeModal();await loadProducts();renderProducts();toast("Produk berhasil disimpan");
    }catch(e){console.error(e);toast("Gagal menyimpan: "+(e.message||"periksa izin database"))}finally{btn.disabled=false;btn.textContent="Simpan Produk"}
  };
}
function renderReports(){
  const done=completedOrders(),sum=done.reduce((a,o)=>a+o.total,0);
  document.getElementById("reportOmzet").textContent=rupiah(sum);document.getElementById("reportTx").textContent=done.length;document.getElementById("reportAvg").textContent=rupiah(done.length?sum/done.length:0);
  document.getElementById("reportDigital").textContent=rupiah(done.filter(o=>["QRIS","Transfer"].includes(o.method)).reduce((a,o)=>a+o.total,0));
  const period=+(document.getElementById("reportPeriod")?.value||30);drawChart(document.getElementById("reportChart"),period);watchChartResize(document.getElementById("reportChart"),period);
  const pay={};done.forEach(o=>pay[o.method]=(pay[o.method]||0)+o.total);document.getElementById("paymentBreakdown").innerHTML=Object.entries(pay).map(([k,v])=>`<div class="rank-row"><span>${esc(k)}</span><b>${rupiah(v)}</b></div>`).join("")||'<div class="muted">Belum ada transaksi.</div>';
}
async function loadCashiers(){
  const box=document.getElementById("usersList");
  if(!box||!isAdmin())return;
  box.innerHTML='<div class="muted">Memuat akun kasir…</div>';
  try{
    const {data:session}=await db.auth.getSession();
    const token=session?.session?.access_token;
    if(!token){box.innerHTML='<div class="muted">Sesi login tidak ditemukan.</div>';return}
    const r=await fetch(`${window.POSTKU_SUPABASE_URL}/functions/v1/postku-admin-users`,{headers:{Authorization:`Bearer ${token}`,apikey:window.POSTKU_SUPABASE_KEY}});
    const data=await r.json();
    if(!r.ok)throw new Error(data?.error||"Gagal memuat akun kasir");
    const users=data.users||[];
    box.innerHTML=users.map(u=>`<div class="user-row"><div><b>${esc(u.display_name||u.username)}</b><small class="muted">@${esc(u.username)}</small></div><span class="badge paid">KASIR</span></div>`).join("")||'<div class="muted">Belum ada akun kasir.</div>';
  }catch(e){console.error(e);box.innerHTML='<div class="muted">Gagal memuat akun kasir.</div>'}
}
async function createCashier(){
  if(!isAdmin()){toast("Hanya Admin");return}
  openModal(`<h2>Tambah Kasir</h2><p class="muted">Buat akun login khusus kasir. Email internal dibuat otomatis oleh POSTKU.</p><div class="field"><label>Username</label><input id="cashierUsername" autocomplete="off" placeholder="Contoh: kasir01"></div><div class="field"><label>Nama kasir</label><input id="cashierName" autocomplete="off" placeholder="Contoh: Andi"></div><div class="field"><label>Password</label><input id="cashierPassword" type="password" autocomplete="new-password" placeholder="Minimal 6 karakter"></div><button class="primary" style="width:100%" id="saveCashier">Buat Akun Kasir</button>`);
  document.getElementById("saveCashier").onclick=async()=>{
    const btn=document.getElementById("saveCashier"),username=document.getElementById("cashierUsername").value.trim(),display_name=document.getElementById("cashierName").value.trim(),password=document.getElementById("cashierPassword").value;
    if(!username||!password){toast("Username dan password wajib diisi");return}
    btn.disabled=true;btn.textContent="Membuat…";
    try{
      const {data:session}=await db.auth.getSession();const token=session?.session?.access_token;if(!token)throw new Error("Sesi login tidak ditemukan");
      const r=await fetch(`${window.POSTKU_SUPABASE_URL}/functions/v1/postku-admin-users`,{method:"POST",headers:{Authorization:`Bearer ${token}`,apikey:window.POSTKU_SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({username,display_name:display_name||username,password})});
      const data=await r.json();if(!r.ok)throw new Error(data?.error||"Gagal membuat akun");
      closeModal();await loadCashiers();toast(`Akun kasir @${username} berhasil dibuat`);
    }catch(e){console.error(e);toast(e.message||"Gagal membuat akun kasir")}finally{btn.disabled=false;btn.textContent="Buat Akun Kasir"}
  };
}
function renderSettings(){
  const x=S.settings;for(const id of ["shopName","shopAddress","shopPhone","bankName","bankAccount","bankOwner","paperSize"]){const el=document.getElementById(id);if(el)el.value=x[id]||""}
  const q=document.getElementById("qrisPreview");if(x.qris){q.src=x.qris;q.classList.remove("hidden")}else q.classList.add("hidden");
  if(isAdmin())loadCashiers();
}
async function saveSettings(){
  const payload={store_name:document.getElementById("shopName").value.trim()||"POSTKU",bank_name:document.getElementById("bankName").value.trim()||null,bank_account_name:document.getElementById("bankOwner").value.trim()||null,bank_account_number:document.getElementById("bankAccount").value.trim()||null,qris_image_url:S.settings.qris||null};
  const {error}=await db.from("store_settings").upsert({id:1,...payload});if(error){toast("Gagal menyimpan pengaturan");return}await loadSettings();toast("Pengaturan tersimpan");
}
function openModal(html){document.getElementById("modalBody").innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function printReceipt(o){
  const w=window.open("","_blank");if(!w){toast("Izinkan pop-up untuk mencetak");return}
  const size=S.settings.paperSize==="80"?"80mm":"58mm";
  const items=o.items.map(i=>`<tr><td>${i.qty}× ${esc(i.name)}</td><td>${rupiah(i.price*i.qty)}</td></tr>`).join("");
  w.document.write(`<html><head><title>${esc(o.displayId||o.id)}</title><style>@page{size:${size} auto;margin:0}body{font-family:monospace;width:${size};margin:0;padding:4mm;font-size:12px}h2{text-align:center;margin:0 0 4px}p{margin:3px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}td:last-child{text-align:right}.line{border-top:1px dashed #000;margin:7px 0}.center{text-align:center}</style></head><body><h2>${esc(S.settings.shopName||"POSTKU")}</h2><p class="center">${esc(S.settings.shopAddress||"")}</p><div class="line"></div><p>Order: ${esc(o.displayId||o.id)}</p><p>Pembeli: ${esc(o.buyer)}</p><p>Kasir: ${esc(o.cashier||"")}</p><p>${new Date(o.date).toLocaleString("id-ID")}</p><div class="line"></div><table>${items}</table><div class="line"></div><table><tr><td><b>TOTAL</b></td><td><b>${rupiah(o.total)}</b></td></tr>${o.method!=="-"?`<tr><td>${esc(o.method)}</td><td>${rupiah(o.cash)}</td></tr><tr><td>Kembali</td><td>${rupiah(o.change)}</td></tr>`:""}</table><div class="line"></div><p class="center">Terima kasih</p><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`);
  w.document.close();
}
function exportCSV(){
  const rows=[["ID","Tanggal","Pembeli","Kasir","Status","Metode","Total"],...S.orders.map(o=>[o.displayId,o.date,o.buyer,o.cashier,o.status,o.method,o.total])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="postku-laporan.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function addUser(){createCashier()}
function testPrint(){const o={displayId:"TEST-001",date:new Date().toISOString(),buyer:"Test",cashier:current?.username||"Kasir",items:[{name:"Contoh Produk",price:10000,qty:1}],total:10000,method:"Tunai",cash:10000,change:0};printReceipt(o)}

document.addEventListener("click",async e=>{
  const nav=e.target.closest("[data-nav]");if(nav)return go(nav.dataset.nav);
  const add=e.target.closest("[data-add]");if(add)return chooseVariant(add.dataset.add);
  const chip=e.target.closest("[data-cat]");if(chip){activeCat=chip.dataset.cat;return renderKasir();}
  const plus=e.target.closest("[data-plus]"),minus=e.target.closest("[data-minus]");
  if(plus||minus){const key=String(plus?.dataset.plus||minus?.dataset.minus),i=S.cart.find(x=>x.key===key);if(i){if(plus){if(i.maxStock!=null&&i.qty>=i.maxStock){toast("Stok varian tidak cukup");return}i.qty++;}else i.qty--;if(i.qty<=0)S.cart=S.cart.filter(x=>x.key!==key);localSave();renderCart();}return;}
  const tab=e.target.closest("[data-status]");if(tab){orderFilter=tab.dataset.status;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));renderOrders();return;}
  const resume=e.target.closest("[data-resume]");if(resume)return resumeOrder(resume.dataset.resume);
  const cancel=e.target.closest("[data-cancel]");if(cancel&&confirm("Batalkan pesanan ini?"))return cancelOrder(cancel.dataset.cancel);
  const rep=e.target.closest("[data-reprint]");if(rep){const o=S.orders.find(x=>x.id===rep.dataset.reprint);if(o)printReceipt(o);return;}
  const vo=e.target.closest("[data-void]");if(vo&&confirm("Void transaksi ini?"))return voidOrder(vo.dataset.void);
  const edit=e.target.closest("[data-edit]");if(edit)return productModal(edit.dataset.edit);
  const del=e.target.closest("[data-delete]");if(del&&confirm("Hapus produk?")){const {error}=await db.from("products").delete().eq("id",del.dataset.delete);if(error)toast("Gagal menghapus produk");else{await loadProducts();renderProducts();toast("Produk dihapus");}return;}
});
document.getElementById("loginBtn").onclick=login;
document.getElementById("loginPass").onkeydown=e=>{if(e.key==="Enter")login()};
document.getElementById("logoutBtn").onclick=logout;
document.getElementById("salesPeriod").onchange=()=>{const c=document.getElementById("salesChart");c.dataset.period=document.getElementById("salesPeriod").value;drawChart(c,+c.dataset.period)};
document.getElementById("reportPeriod").onchange=()=>renderReports();
document.getElementById("productSearch").oninput=renderKasir;
document.getElementById("buyerName").oninput=e=>{S.buyerName=e.target.value;localSave()};
document.getElementById("tableNo").oninput=e=>{S.tableNo=e.target.value;localSave()};
document.getElementById("clearCartBtn").onclick=()=>{if(confirm("Kosongkan keranjang?"))clearCart()};
document.getElementById("checkoutBtn").onclick=openCheckout;
document.getElementById("pendingBtn").onclick=createPending;
document.getElementById("addProductBtn").onclick=()=>productModal();
document.getElementById("exportBtn").onclick=exportCSV;
document.getElementById("saveSettingsBtn").onclick=saveSettings;
document.getElementById("testPrintBtn").onclick=testPrint;
document.getElementById("addUserBtn").onclick=addUser;
document.getElementById("qrisInput").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{S.settings.qris=r.result;document.getElementById("qrisPreview").src=r.result;document.getElementById("qrisPreview").classList.remove("hidden")};r.readAsDataURL(f)};
document.getElementById("modalClose").onclick=closeModal;
document.getElementById("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};

window.addEventListener("online",()=>toast("Koneksi kembali"));
window.addEventListener("offline",()=>toast("Offline: data lokal keranjang tetap aman"));
if("serviceWorker" in navigator)window.addEventListener("load",async()=>{try{await navigator.serviceWorker.register("sw.js")}catch(e){}});
window.addEventListener("load",()=>setTimeout(()=>restoreSession(),100));
