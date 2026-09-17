const KEY="postku_v2";
const defaultProducts=[
{id:1,name:"Nasi Goreng",price:15000,cat:"Makanan",img:"https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=700&q=80"},
{id:2,name:"Ayam Geprek",price:17000,cat:"Makanan",img:"https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=700&q=80"},
{id:3,name:"Mie Goreng",price:13000,cat:"Makanan",img:"https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=700&q=80"},
{id:4,name:"Es Teh",price:5000,cat:"Minuman",img:"https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80"},
{id:5,name:"Kopi Susu",price:10000,cat:"Minuman",img:"https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=700&q=80"},
{id:6,name:"Jus Jeruk",price:9000,cat:"Minuman",img:"https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=700&q=80"}
];
const defaultState={
users:[{id:1,username:"navyabites",password:"Bakung2no47",role:"admin"},{id:2,username:"kasir",password:"kasir123",role:"cashier"}],
products:defaultProducts,orders:[],cart:[],settings:{shopName:"POSTKU",shopAddress:"",shopPhone:"",bankName:"",bankAccount:"",bankOwner:"",qris:"",paperSize:"58"}
};
const SESSION_KEY="postku_login_session_v1";
let S=load(); let current=null; let activeCat="Semua"; let orderFilter="all";
function makeId(prefix="id"){return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`}
function normalizeProduct(p){
 const product={...p};
 product.id=String(product.id??makeId("prod"));
 product.name=String(product.name??"").trim();
 product.price=Math.max(0,Number(product.price)||0);
 product.cat=String(product.cat||"Lainnya");
 product.img=typeof product.img==="string"?product.img:"";
 if(Array.isArray(product.variants)&&product.variants.length){
  product.variants=product.variants.map((v,i)=>({id:String(v.id??`${product.id}_v${i+1}`),name:String(v.name||`Varian ${i+1}`),price:Math.max(0,Number(v.price??product.price)||0),stock:Math.max(0,Math.floor(Number(v.stock)||0)),sku:String(v.sku||"")}));
 }else{
  product.variants=[{id:`${product.id}_v1`,name:"Reguler",price:product.price,stock:Math.max(0,Math.floor(Number(product.stock)||0)),sku:String(product.sku||"")}];
 }
 product.price=product.variants[0]?.price??product.price;
 product.stock=product.variants.reduce((n,v)=>n+v.stock,0);
 return product;
}
function normalizeState(saved){
 const state={...structuredClone(defaultState),...(saved||{})};
 state.users=Array.isArray(saved?.users)&&saved.users.length?structuredClone(saved.users):structuredClone(defaultState.users);
 let admin=state.users.find(u=>u.role==="admin");
 if(!admin)state.users.unshift({id:1,username:"navyabites",password:"Bakung2no47",role:"admin"});
 else {admin.username="navyabites";admin.password="Bakung2no47";admin.role="admin"}
 state.products=(Array.isArray(saved?.products)?saved.products:structuredClone(defaultState.products)).map(normalizeProduct);
 state.orders=Array.isArray(saved?.orders)?saved.orders.map(o=>({...o,id:String(o.id),items:Array.isArray(o.items)?o.items.map(i=>({...i,id:String(i.id),variantId:i.variantId?String(i.variantId):null,qty:Math.max(1,Math.floor(Number(i.qty)||1))})):[]})):[];
 state.cart=Array.isArray(saved?.cart)?saved.cart.map(i=>({...i,id:String(i.id),variantId:i.variantId?String(i.variantId):null,qty:Math.max(1,Math.floor(Number(i.qty)||1))})):[];
 state.settings={...structuredClone(defaultState.settings),...(saved?.settings||{})};
 state.buyerName=String(saved?.buyerName||"");state.tableNo=String(saved?.tableNo||"");
 return state;
}
function load(){try{return normalizeState(JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{return normalizeState({})}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));return true}catch(err){console.error("POSTKU local save failed",err);toast("Penyimpanan penuh. Kurangi ukuran foto atau buat backup.");return false}}
function syncProductStock(p){p.stock=p.variants.reduce((n,v)=>n+Math.max(0,Number(v.stock)||0),0)}
function rupiah(n){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){let x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1800)}
function isAdmin(){return current?.role==="admin"}
function showLoggedIn(){
 document.getElementById("loginScreen").classList.add("hidden");
 document.getElementById("mainScreen").classList.remove("hidden");
 document.getElementById("currentUser").textContent=`${current.username} · ${current.role==="admin"?"Admin":"Kasir"}`;
 document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!isAdmin()));
 go("dashboard");
}
function saveLoginSession(user){
 try{localStorage.setItem(SESSION_KEY,JSON.stringify({id:user.id,username:user.username,role:user.role}))}catch{}
}
function restoreLoginSession(){
 try{
  const raw=localStorage.getItem(SESSION_KEY);
  if(!raw)return false;
  const saved=JSON.parse(raw);
  const found=S.users.find(x=>String(x.id)===String(saved.id)&&x.username===saved.username&&x.role===saved.role);
  if(!found){localStorage.removeItem(SESSION_KEY);return false}
  current=found;
  showLoggedIn();
  return true;
 }catch{localStorage.removeItem(SESSION_KEY);return false}
}
function login(){
 const u=document.getElementById("loginUser").value.trim(),p=document.getElementById("loginPass").value;
 const found=S.users.find(x=>x.username===u&&x.password===p);
 if(!found){document.getElementById("loginError").textContent="Username atau password salah.";return}
 current=found;
 if(document.getElementById("rememberLogin")?.checked) saveLoginSession(found); else localStorage.removeItem(SESSION_KEY);
 document.getElementById("loginError").textContent="";
 showLoggedIn();
}
function logout(){
 current=null;
 localStorage.removeItem(SESSION_KEY);
 document.getElementById("mainScreen").classList.add("hidden");
 document.getElementById("loginScreen").classList.remove("hidden");
 document.getElementById("loginPass").value="";
 document.getElementById("loginError").textContent="";
}
function go(name){
 document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));document.getElementById("view-"+name).classList.remove("hidden");
 document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.nav===name));
 const titles={dashboard:"Dashboard",kasir:"Kasir",orders:"Pesanan",products:"Produk",reports:"Laporan",settings:"Pengaturan"};document.getElementById("pageTitle").textContent=titles[name];
 if(name==="dashboard")renderDashboard(); if(name==="kasir")renderKasir(); if(name==="orders")renderOrders();if(name==="products")renderProducts();if(name==="reports")renderReports();if(name==="settings")renderSettings();
}
function todayKey(d=new Date()){return d.toISOString().slice(0,10)}
function renderDashboard(){
 const today=todayKey(),done=S.orders.filter(o=>o.status==="paid"&&o.date.slice(0,10)===today);
 document.getElementById("statOmzet").textContent=rupiah(done.reduce((a,o)=>a+o.total,0));
 document.getElementById("statTx").textContent=done.length;
 document.getElementById("statPending").textContent=S.orders.filter(o=>o.status==="pending").length;
 document.getElementById("statProducts").textContent=S.products.length;
 const period=+(document.getElementById("salesPeriod")?.value||7);
 const salesCanvas=document.getElementById("salesChart");
 salesCanvas.dataset.period=period;
 drawChart(salesCanvas,period);
 watchChartResize(salesCanvas,period);
 const counts={};
 done.forEach(o=>o.items.forEach(i=>counts[i.name]=(counts[i.name]||0)+i.qty));
 document.getElementById("topProducts").innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6)
 .map((x,i)=>`<div class="rank-row"><span>${i+1}. ${esc(x[0])}</span><b>${x[1]} terjual</b></div>`).join("")
 ||'<div class="muted">Belum ada penjualan.</div>';
}
function chartBuckets(period){
 const now=new Date(), out=[];
 if(period===1){
  for(let i=23;i>=0;i--){const d=new Date(now);d.setHours(now.getHours()-i,0,0,0);out.push({key:d.toISOString().slice(0,13),label:d.getHours().toString().padStart(2,"0")+":00",value:0})}
 }else if(period===7||period===30){
  for(let i=period-1;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i);out.push({key:todayKey(d),label:period===7?d.toLocaleDateString("id-ID",{weekday:"short"}):d.getDate().toString(),value:0})}
 }else if(period===90){
  for(let i=12;i>=0;i--){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-i*7);const start=new Date(d);start.setDate(start.getDate()-6);out.push({key:todayKey(start),label:start.toLocaleDateString("id-ID",{day:"numeric",month:"short"}),value:0})}
 }else{
  for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);out.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("id-ID",{month:"short"}),value:0})}
 }
 return out;
}
function drawChart(canvas,period){
 if(!canvas)return;
 const ctx=canvas.getContext("2d"),dpr=window.devicePixelRatio||1;
 const rect=canvas.parentElement?.getBoundingClientRect()||canvas.getBoundingClientRect();
 const w=Math.max(220,Math.floor(rect.width||canvas.clientWidth||300));
 const h=Math.max(180,Math.floor(window.innerWidth<=520?200:220));
 canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);
 canvas.style.width="100%";canvas.style.height=h+"px";
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const buckets=chartBuckets(period);
 S.orders.filter(o=>o.status==="paid").forEach(o=>{
  const d=new Date(o.date), dateKey=o.date.slice(0,10);
  let key;
  if(period===1) key=o.date.slice(0,13);
  else if(period===7||period===30) key=dateKey;
  else if(period===90){const base=new Date(d);base.setHours(0,0,0,0);const day=(base.getDay()+6)%7;base.setDate(base.getDate()-day);const start=new Date(base);start.setDate(start.getDate()-6);key=todayKey(start)}
  else key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const b=buckets.find(x=>x.key===key);if(b)b.value+=o.total;
 });
 const vals=buckets.map(b=>b.value),max=Math.max(...vals,1);
 const pad={l:42,r:12,t:18,b:30},cw=Math.max(1,w-pad.l-pad.r),ch=Math.max(1,h-pad.t-pad.b);
 ctx.font="10px system-ui";ctx.lineWidth=1;ctx.strokeStyle="#e2e8f0";ctx.fillStyle="#64748b";
 for(let j=0;j<4;j++){const y=pad.t+ch*j/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();if(j<3)ctx.fillText(rupiah(Math.round(max*(3-j)/3)),3,y+3)}
 const points=vals.map((v,i)=>({x:pad.l+cw*(i/(vals.length-1||1)),y:pad.t+ch-(v/max)*ch}));
 ctx.strokeStyle="#2563eb";ctx.lineWidth=3;ctx.lineJoin="round";ctx.lineCap="round";ctx.beginPath();
 points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
 points.forEach((p,i)=>{ctx.fillStyle="#2563eb";ctx.beginPath();ctx.arc(p.x,p.y,3.2,0,Math.PI*2);ctx.fill()});
 ctx.fillStyle="#64748b";ctx.font="10px system-ui";
 const step=period===1?4:period===7?1:period===30?5:period===90?2:2;
 buckets.forEach((b,i)=>{if(i%step===0||i===buckets.length-1){const p=points[i];let label=b.label;const tw=ctx.measureText(label).width;ctx.fillText(label,Math.max(0,Math.min(p.x-tw/2,w-tw)),h-8)}});
 if(!vals.some(Boolean)){ctx.fillStyle="#94a3b8";ctx.font="12px system-ui";ctx.textAlign="center";ctx.fillText("Belum ada penjualan pada periode ini",w/2,h/2);ctx.textAlign="left"}
}
function watchChartResize(canvas,period){
 if(!canvas||canvas._postkuResizeObserved)return;
 canvas._postkuResizeObserved=true;
 if("ResizeObserver" in window){
  const ro=new ResizeObserver(()=>requestAnimationFrame(()=>drawChart(canvas,+(canvas.dataset.period||period))));
  ro.observe(canvas.parentElement||canvas);canvas._postkuResizeObserver=ro;
 }
}
function renderKasir(){
 const cats=["Semua",...new Set(S.products.map(p=>p.cat))];
 document.getElementById("categoryBar").innerHTML=cats.map(c=>`<button class="chip ${activeCat===c?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
 const q=document.getElementById("productSearch").value.toLowerCase().trim();
 const list=S.products.filter(p=>(activeCat==="Semua"||p.cat===activeCat)&&p.name.toLowerCase().includes(q));
 document.getElementById("productResultCount").textContent=` · ${list.length} produk`;
 document.getElementById("productGrid").innerHTML=list.map(p=>{
   const inCart=S.cart.filter(x=>x.id===String(p.id)).reduce((n,x)=>n+x.qty,0);
   const stock=p.variants.reduce((n,v)=>n+v.stock,0);
   const priceMin=Math.min(...p.variants.map(v=>v.price));
   const priceMax=Math.max(...p.variants.map(v=>v.price));
   const priceText=priceMin===priceMax?rupiah(priceMin):`${rupiah(priceMin)} – ${rupiah(priceMax)}`;
   return `<button class="product-card" data-add="${esc(p.id)}" ${stock<=0?"disabled":""}>
     <div class="product-image-wrap"><img class="product-photo" src="${esc(p.img||placeholder())}" onerror="this.src='${placeholder()}'"><span class="product-category">${esc(p.cat)}</span>${inCart?`<span class="product-qty">${inCart}</span>`:""}${stock<=0?`<span class="product-category" style="right:9px;left:auto;background:#991b1b">Habis</span>`:""}</div>
     <div class="product-info"><div class="product-name">${esc(p.name)}</div><div class="muted" style="font-size:10px">${p.variants.length>1?`${p.variants.length} varian · stok ${stock}`:`Stok ${stock}`}</div><div class="product-bottom"><div class="product-price">${priceText}</div><span class="add-dot">+</span></div></div>
   </button>`;
 }).join("")||`<div class="empty-products"><div>⌕</div><b>Produk tidak ditemukan</b><span>Coba kata kunci atau kategori lain.</span></div>`;
 document.getElementById("buyerName").value=S.buyerName||"";
 document.getElementById("tableNo").value=S.tableNo||"";
 renderCart();
}
function placeholder(){return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="28">POSTKU</text></svg>`)}
function compressImage(file,done){
 const r=new FileReader();
 r.onload=()=>{
  const im=new Image();
  im.onload=()=>{
   const size=400,c=document.createElement("canvas");c.width=size;c.height=size;
   const ctx=c.getContext("2d");
   const scale=Math.max(size/im.width,size/im.height),w=im.width*scale,h=im.height*scale;
   const x=(size-w)/2,y=(size-h)/2;ctx.drawImage(im,x,y,w,h);
   let quality=.78,data=c.toDataURL("image/jpeg",quality);
   // Keep product photos friendly to localStorage. Reduce quality if needed.
   while(data.length>180000&&quality>.45){quality-=.05;data=c.toDataURL("image/jpeg",quality)}
   done(data);
  };
  im.onerror=()=>done(null);im.src=r.result;
 };
 r.onerror=()=>done(null);r.readAsDataURL(file);
}
function addToCart(id){
 const p=S.products.find(x=>String(x.id)===String(id));if(!p)return;
 const available=p.variants.filter(v=>v.stock>0);if(!available.length){toast("Stok produk habis");return}
 if(p.variants.length===1){addVariantToCart(p,p.variants[0]);return}
 openModal(`<h2>Pilih Varian</h2><p class="muted">${esc(p.name)}</p><div id="variantChoices" style="display:grid;gap:9px">${p.variants.map(v=>`<button class="secondary" data-choose-variant="${esc(v.id)}" style="display:flex;justify-content:space-between;align-items:center" ${v.stock<=0?"disabled":""}><span>${esc(v.name)}</span><b>${rupiah(v.price)} · stok ${v.stock}</b></button>`).join("")}</div>`);
}
function addVariantToCart(p,v){
 const key=`${p.id}::${v.id}`;const i=S.cart.find(x=>x.key===key);
 const qty=i?.qty||0;if(qty>=v.stock){toast("Jumlah melebihi stok");return}
 if(i)i.qty++;else S.cart.push({key,id:String(p.id),variantId:String(v.id),name:p.name,variantName:v.name,price:v.price,qty:1});
 S.buyerName=document.getElementById("buyerName")?.value||S.buyerName||"";S.tableNo=document.getElementById("tableNo")?.value||S.tableNo||"";save();closeModal();renderKasir();
}
function renderCart(){
 const el=document.getElementById("cartItems");
 const count=S.cart.reduce((a,x)=>a+x.qty,0);
 document.getElementById("cartCount").textContent=`${count} item`;document.getElementById("quickCartCount").textContent=count;document.getElementById("mobileCartCount").textContent=count;
 el.innerHTML=S.cart.map(i=>`<div class="cart-row"><div class="cart-row-main"><b>${esc(i.name)}${i.variantName?` · ${esc(i.variantName)}`:""}</b><span class="muted">${rupiah(i.price)} / item</span><div class="qty"><button data-minus="${esc(i.key||`${i.id}::${i.variantId||""}`)}">−</button><span>${i.qty}</span><button data-plus="${esc(i.key||`${i.id}::${i.variantId||""}`)}">+</button></div></div><div class="cart-row-total"><b>${rupiah(i.price*i.qty)}</b></div></div>`).join("")||'<div class="cart-empty"><div>🛒</div><b>Keranjang masih kosong</b><span>Pilih produk di sebelah kiri untuk memulai pesanan.</span></div>';
 document.getElementById("cartTotal").textContent=rupiah(cartTotal());
}
function clearCart(){S.cart=[];S.buyerName="";S.tableNo="";save();renderCart()}
function cartTotal(){return S.cart.reduce((a,x)=>a+x.price*x.qty,0)}
function findCartItem(key){return S.cart.find(x=>(x.key||`${x.id}::${x.variantId||""}`)===key)}
function checkStockForCart(){
 for(const i of S.cart){const p=S.products.find(x=>String(x.id)===String(i.id));const v=p?.variants.find(x=>String(x.id)===String(i.variantId));if(!p||!v||i.qty>v.stock)return false}return true;
}

function openCheckout(){
 if(!S.cart.length){toast("Keranjang masih kosong");return}
 openModal(`<h2>Pembayaran</h2><div class="field"><label>Nama pembeli</label><input id="payBuyer" value="${esc(document.getElementById("buyerName").value)}"></div><div class="field"><label>Metode pembayaran</label><select id="payMethod"><option>Tunai</option><option>QRIS</option><option>Transfer</option><option>Debit</option></select></div><div class="field" id="cashField"><label>Uang diterima</label><input id="cashReceived" type="number" inputmode="numeric" placeholder="${cartTotal()}"></div><div class="panel"><b>Total ${rupiah(cartTotal())}</b><div id="changeText" class="muted" style="margin-top:6px"></div></div><button class="primary" style="width:100%" id="confirmPay">Selesaikan & Cetak</button>`);
 const method=document.getElementById("payMethod");const cash=document.getElementById("cashReceived");const change=()=>{let c=+cash.value||0;document.getElementById("changeText").textContent=method.value==="Tunai"?`Kembalian: ${rupiah(Math.max(0,c-cartTotal()))}`:""};
 method.onchange=()=>{document.getElementById("cashField").classList.toggle("hidden",method.value!=="Tunai");change()};cash.oninput=change;document.getElementById("confirmPay").onclick=()=>finishPayment(method.value,+cash.value||0);
}
function finishPayment(method,cash){
 const total=cartTotal();if(!checkStockForCart()){toast("Stok berubah atau tidak mencukupi. Periksa keranjang.");renderKasir();return}if(method==="Tunai"&&cash<total){toast("Uang diterima kurang");return}
 const now=new Date();const order={id:"ORD-"+now.getTime().toString().slice(-8),date:now.toISOString(),buyer:document.getElementById("payBuyer").value.trim()||"Umum",table:document.getElementById("tableNo").value.trim(),items:structuredClone(S.cart),total,method,cash,change:Math.max(0,cash-total),status:"paid",cashier:current.username};
 for(const i of S.cart){const p=S.products.find(x=>String(x.id)===String(i.id));const v=p.variants.find(x=>String(x.id)===String(i.variantId));v.stock-=i.qty;syncProductStock(p)}
 S.orders.unshift(order);clearCart();closeModal();save();go("orders");setTimeout(()=>printReceipt(order,"receipt"),200);toast("Transaksi berhasil");}
function createPending(){if(!S.cart.length){toast("Keranjang masih kosong");return}const now=new Date();const o={id:"ORD-"+now.getTime().toString().slice(-8),date:now.toISOString(),buyer:document.getElementById("buyerName").value.trim()||"Umum",table:document.getElementById("tableNo").value.trim(),items:structuredClone(S.cart),total:cartTotal(),method:"-",cash:0,change:0,status:"pending",cashier:current.username};S.orders.unshift(o);clearCart();save();go("orders");toast("Pesanan disimpan sebagai pending")}
function renderOrders(){const arr=S.orders.filter(o=>orderFilter==="all"||o.status===orderFilter);document.getElementById("ordersList").innerHTML=arr.map(o=>`<div class="order-card"><div class="order-top"><div><b>${o.id}</b><div class="muted">${new Date(o.date).toLocaleString("id-ID")} · ${esc(o.buyer)}${o.table?` · Meja ${esc(o.table)}`:""}</div></div><span class="badge ${o.status}">${o.status==="paid"?"SELESAI":o.status==="pending"?"PENDING":"DIBATALKAN"}</span></div><div class="order-items">${o.items.map(i=>`${i.qty}× ${esc(i.name)}`).join(" · ")}</div><div><b>${rupiah(o.total)}</b> ${o.method!=="-"?`· ${esc(o.method)}`:""}</div><div class="order-actions" style="margin-top:12px">${o.status==="pending"?`<button class="primary" data-resume="${o.id}">Lanjutkan & Bayar</button><button class="secondary" data-cancel="${o.id}">Batalkan</button>`:""}${o.status==="paid"?`<button class="secondary" data-reprint="${o.id}">Cetak Ulang</button><button class="secondary" data-void="${o.id}">Void</button>`:""}</div></div>`).join("")||'<div class="panel muted">Belum ada pesanan.</div>'}
function resumeOrder(id){let o=S.orders.find(x=>x.id===id);if(!o)return;S.cart=structuredClone(o.items).map(i=>({...i,key:i.key||`${i.id}::${i.variantId||""}`}));S.buyerName=o.buyer;S.tableNo=o.table;S.orders=S.orders.filter(x=>x.id!==id);save();go("kasir");toast("Pesanan dikembalikan ke keranjang")}
function cancelOrder(id){let o=S.orders.find(x=>x.id===id);if(!o)return;o.status="cancelled";save();renderOrders();toast("Pesanan dibatalkan")}
function voidOrder(id){if(!isAdmin()){toast("Hanya Admin yang dapat void");return}let o=S.orders.find(x=>x.id===id);if(!o)return;o.status="cancelled";o.voidedBy=current.username;save();renderOrders();toast("Transaksi di-void")}
function renderProducts(){
 document.getElementById("productsList").innerHTML=S.products.map(p=>{const stock=p.variants.reduce((n,v)=>n+v.stock,0);return `<div class="admin-product"><img src="${esc(p.img||placeholder())}" onerror="this.src='${placeholder()}'"><div class="grow"><b>${esc(p.name)}</b><div class="muted">${esc(p.cat)} · ${p.variants.length} varian · stok ${stock}</div><div class="muted" style="font-size:11px">${p.variants.map(v=>`${esc(v.name)} (${rupiah(v.price)}, stok ${v.stock})`).join(" · ")}</div></div><button class="secondary" data-edit="${esc(p.id)}">Edit</button><button class="secondary" data-delete="${esc(p.id)}">Hapus</button></div>`}).join("")||'<div class="panel muted">Belum ada produk.</div>'}
function productModal(id=null){
 let p=id?S.products.find(x=>String(x.id)===String(id)):null;
 if(!p)p={id:null,name:"",price:0,cat:"Makanan",img:"",variants:[{id:makeId("var"),name:"Reguler",price:0,stock:0,sku:""}]};
 let working=structuredClone(normalizeProduct(p)),img=working.img||"";
 openModal(`<h2>${id?"Edit Produk":"Tambah Produk"}</h2><div class="field"><label>Nama produk</label><input id="pName" value="${esc(working.name)}"></div><div class="field"><label>Kategori</label><input id="pCat" value="${esc(working.cat)}"></div><div class="field"><label>Foto produk</label><p class="muted small">Gunakan foto <b>400 × 400 px (1:1)</b>. Jika ukuran berbeda, POSTKU akan otomatis menyesuaikan dan memotong bagian tengah. Format JPG, PNG, atau WebP. Maksimal file asli 4 MB.</p><input id="pFile" type="file" accept="image/jpeg,image/png,image/webp"><button type="button" class="secondary" id="removeProductPhoto" style="margin-top:7px">Hapus Foto</button><img id="pPrev" class="qris-preview" src="${esc(img||placeholder())}"></div><div class="field"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><label style="margin:0">Varian / Rasa</label><button type="button" class="secondary" id="addVariant">+ Tambah Varian</button></div><p class="muted small">Setiap varian memiliki harga dan stok sendiri.</p><div id="variantEditor" style="display:grid;gap:9px"></div></div><button class="primary" style="width:100%" id="saveProduct">Simpan Produk</button>`);
 const renderVariantEditor=()=>{document.getElementById("variantEditor").innerHTML=working.variants.map((v,i)=>`<div class="panel" data-variant-row="${i}" style="padding:10px"><div class="field"><label>Nama varian</label><input data-vname="${i}" value="${esc(v.name)}" placeholder="Contoh: Matcha"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="field"><label>Harga</label><input data-vprice="${i}" type="number" min="0" value="${v.price}"></div><div class="field"><label>Stok</label><input data-vstock="${i}" type="number" min="0" step="1" value="${v.stock}"></div></div><div class="field"><label>SKU (opsional)</label><input data-vsku="${i}" value="${esc(v.sku)}"></div>${working.variants.length>1?`<button type="button" class="secondary" data-remove-variant="${i}">Hapus Varian</button>`:""}</div>`).join("")};
 renderVariantEditor();
 document.getElementById("addVariant").onclick=()=>{working.variants.push({id:makeId("var"),name:`Varian ${working.variants.length+1}`,price:working.price||0,stock:0,sku:""});renderVariantEditor()};
 document.getElementById("variantEditor").addEventListener("click",e=>{const b=e.target.closest("[data-remove-variant]");if(!b)return;working.variants.splice(+b.dataset.removeVariant,1);renderVariantEditor()});
 document.getElementById("pFile").onchange=e=>{const f=e.target.files[0];if(!f)return;if(f.size>4*1024*1024){toast("Foto terlalu besar (maks. 4 MB)");e.target.value="";return}compressImage(f,data=>{if(!data){toast("Foto tidak dapat diproses");return}img=data;document.getElementById("pPrev").src=img})};
 document.getElementById("removeProductPhoto").onclick=()=>{img="";document.getElementById("pPrev").src=placeholder();document.getElementById("pFile").value=""};
 document.getElementById("saveProduct").onclick=()=>{
   working.name=document.getElementById("pName").value.trim();working.cat=document.getElementById("pCat").value.trim()||"Lainnya";
   working.variants.forEach((v,i)=>{v.name=document.querySelector(`[data-vname="${i}"]`).value.trim()||`Varian ${i+1}`;v.price=Math.max(0,Number(document.querySelector(`[data-vprice="${i}"]`).value)||0);v.stock=Math.max(0,Math.floor(Number(document.querySelector(`[data-vstock="${i}"]`).value)||0));v.sku=document.querySelector(`[data-vsku="${i}"]`).value.trim()});
   if(!working.name||!working.variants.length||working.variants.some(v=>v.price<=0)){toast("Lengkapi nama dan harga setiap varian");return}
   const duplicate=S.products.some(x=>String(x.id)!==String(working.id)&&x.name.toLowerCase()===working.name.toLowerCase());if(duplicate){toast("Nama produk sudah digunakan");return}
   working.img=img;working.price=working.variants[0].price;syncProductStock(working);
   if(id){const index=S.products.findIndex(x=>String(x.id)===String(id));if(index<0){toast("Produk tidak ditemukan");return}S.products[index]=normalizeProduct(working)}else{working.id=makeId("prod");working.variants=working.variants.map((v,i)=>({...v,id:makeId(`var${i+1}`)}));S.products.push(normalizeProduct(working))}
   if(save()){closeModal();renderProducts();renderKasir();toast("Produk tersimpan")};
 };
}
function renderReports(){
 let done=S.orders.filter(o=>o.status==="paid"),sum=done.reduce((a,o)=>a+o.total,0);
 document.getElementById("reportOmzet").textContent=rupiah(sum);
 document.getElementById("reportTx").textContent=done.length;
 document.getElementById("reportAvg").textContent=rupiah(done.length?sum/done.length:0);
 let digital=done.filter(o=>["QRIS","Transfer"].includes(o.method)).reduce((a,o)=>a+o.total,0);
 document.getElementById("reportDigital").textContent=rupiah(digital);
 const period=+(document.getElementById("reportPeriod")?.value||30);
 const chart=document.getElementById("reportChart");chart.dataset.period=period;
 drawChart(chart,period);watchChartResize(chart,period);
 let pay={};done.forEach(o=>pay[o.method]=(pay[o.method]||0)+o.total);
 document.getElementById("paymentBreakdown").innerHTML=Object.entries(pay)
 .map(x=>`<div class="rank-row"><span>${esc(x[0])}</span><b>${rupiah(x[1])}</b></div>`).join("")
 ||'<div class="muted">Belum ada transaksi.</div>';
}
function renderSettings(){let x=S.settings;for(const id of ["shopName","shopAddress","shopPhone","bankName","bankAccount","bankOwner","paperSize"])document.getElementById(id).value=x[id]||"";if(x.qris){document.getElementById("qrisPreview").src=x.qris;document.getElementById("qrisPreview").classList.remove("hidden")}document.getElementById("usersList").innerHTML=isAdmin()?S.users.map(u=>`<div class="rank-row"><span>${esc(u.username)} <small class="muted">(${u.role})</small></span><b>${u.id===current.id?"AKUN SAYA":`<button class="secondary" data-userdel="${u.id}">Hapus</button>`}</b></div>`).join(""):""}
function saveSettings(){for(const id of ["shopName","shopAddress","shopPhone","bankName","bankAccount","bankOwner","paperSize"])S.settings[id]=document.getElementById(id).value;save();toast("Pengaturan disimpan")}
function downloadJSON(filename,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function backupData(){
 const stamp=new Date();
 const backup={format:"POSTKU-BACKUP",version:2,createdAt:stamp.toISOString(),data:{users:structuredClone(S.users),products:structuredClone(S.products),orders:structuredClone(S.orders),cart:structuredClone(S.cart),settings:structuredClone(S.settings)}};
 const date=stamp.toISOString().replace(/[:.]/g,"-");
 downloadJSON(`postku-backup-${date}.json`,backup);
 const info=document.getElementById("backupInfo");if(info)info.textContent=`Backup dibuat ${stamp.toLocaleString("id-ID")}. Simpan file ini di tempat aman.`;
 toast("Backup data berhasil dibuat");
}
function restoreDataFile(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const backup=JSON.parse(reader.result);
   const d=backup?.data;
   if(backup?.format!=="POSTKU-BACKUP"||!d||!Array.isArray(d.users)||!Array.isArray(d.products)||!Array.isArray(d.orders)||!Array.isArray(d.cart)||!d.settings||typeof d.settings!=="object") throw new Error("Format backup tidak valid");
   if(!confirm("Restore akan mengganti data lokal POSTKU saat ini dengan data dari backup. Data saat ini akan dibackup otomatis terlebih dahulu. Lanjutkan?"))return;
   backupData();
   S={users:structuredClone(d.users),products:structuredClone(d.products),orders:structuredClone(d.orders),cart:structuredClone(d.cart),settings:{...structuredClone(defaultState.settings),...structuredClone(d.settings)}};
   let admin=S.users.find(u=>u.role==="admin");
   if(!admin){S.users.unshift({id:1,username:"navyabites",password:"Bakung2no47",role:"admin"})}
   save();
   localStorage.removeItem(SESSION_KEY);
   current=null;
   document.getElementById("mainScreen").classList.add("hidden");
   document.getElementById("loginScreen").classList.remove("hidden");
   document.getElementById("loginUser").value="";document.getElementById("loginPass").value="";
   toast("Restore berhasil. Silakan login kembali.");
  }catch(err){toast(err.message||"File backup tidak dapat dipulihkan")}
  document.getElementById("restoreFile").value="";
 };
 reader.readAsText(file);
}
function openModal(html){document.getElementById("modalBody").innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function printReceipt(o,type="receipt"){const w=window.open("","_blank");if(!w){toast("Izinkan pop-up untuk mencetak");return}let size=S.settings.paperSize==="80"?"80mm":"58mm";let items=o.items.map(i=>`<tr><td>${i.qty}× ${esc(i.name)}${i.variantName?`<br><span style="font-size:10px">Varian: ${esc(i.variantName)}</span>`:""}</td><td>${rupiah(i.price*i.qty)}</td></tr>`).join("");w.document.write(`<html><head><title>${o.id}</title><style>@page{size:${size} auto;margin:0}body{font-family:monospace;width:${size};margin:0;padding:4mm;font-size:12px}h2{text-align:center;margin:0 0 4px}p{margin:3px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}td:last-child{text-align:right}.line{border-top:1px dashed #000;margin:7px 0}.center{text-align:center}</style></head><body><h2>${esc(S.settings.shopName||"POSTKU")}</h2><p class="center">${esc(S.settings.shopAddress||"")}</p><div class="line"></div><p>Order: ${o.id}</p><p>Pembeli: ${esc(o.buyer)}</p><p>Kasir: ${esc(o.cashier)}</p><p>${new Date(o.date).toLocaleString("id-ID")}</p><div class="line"></div><table>${items}</table><div class="line"></div><table><tr><td><b>TOTAL</b></td><td><b>${rupiah(o.total)}</b></td></tr>${o.method!=="-"?`<tr><td>${esc(o.method)}</td><td>${rupiah(o.cash)}</td></tr><tr><td>Kembali</td><td>${rupiah(o.change)}</td></tr>`:""}</table><div class="line"></div><p class="center">Terima kasih</p><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`);w.document.close()}
function exportCSV(){let rows=[["ID","Tanggal","Pembeli","Kasir","Status","Metode","Total"],...S.orders.map(o=>[o.id,o.date,o.buyer,o.cashier,o.status,o.method,o.total])];let csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="postku-backup-laporan.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function printDailyReport(){
 const input=document.getElementById("reportDate");const dateKey=input?.value||todayKey();
 const done=S.orders.filter(o=>o.status==="paid"&&o.date.slice(0,10)===dateKey);
 const total=done.reduce((a,o)=>a+o.total,0),cash=done.filter(o=>o.method==="Tunai").reduce((a,o)=>a+o.total,0),qris=done.filter(o=>o.method==="QRIS").reduce((a,o)=>a+o.total,0),transfer=done.filter(o=>o.method==="Transfer").reduce((a,o)=>a+o.total,0),debit=done.filter(o=>o.method==="Debit").reduce((a,o)=>a+o.total,0);
 const items={};done.forEach(o=>o.items.forEach(i=>{const k=i.variantName?`${i.name} — ${i.variantName}`:i.name;items[k]=(items[k]||0)+i.qty}));
 const itemRows=Object.entries(items).sort((a,b)=>b[1]-a[1]).map(([name,qty])=>`<tr><td>${esc(name)}</td><td>${qty}</td></tr>`).join("")||'<tr><td colspan="2" class="center">Tidak ada penjualan</td></tr>';
 const txRows=done.map(o=>`<tr><td>${esc(o.id.replace("ORD-",""))}</td><td>${rupiah(o.total)}</td></tr>`).join("")||'<tr><td colspan="2" class="center">Tidak ada transaksi</td></tr>';
 const w=window.open("","_blank");if(!w){toast("Izinkan pop-up untuk mencetak");return}let size=S.settings.paperSize==="80"?"80mm":"58mm";
 w.document.write(`<html><head><title>Laporan ${dateKey}</title><style>@page{size:${size} auto;margin:0}body{font-family:monospace;width:${size};margin:0;padding:4mm;font-size:11px;box-sizing:border-box}h2{text-align:center;margin:0 0 3px;font-size:15px}p{margin:3px 0}.line{border-top:1px dashed #000;margin:7px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}td:last-child{text-align:right}.total{font-size:13px;font-weight:bold}.center{text-align:center}.small{font-size:10px;color:#444}.section{font-weight:bold;margin-top:6px}</style></head><body><h2>${esc(S.settings.shopName||"POSTKU")}</h2><p class="center">LAPORAN PENJUALAN HARIAN</p><p class="center">${new Date(dateKey+"T00:00:00").toLocaleDateString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</p><div class="line"></div><table><tr><td>Transaksi</td><td>${done.length}</td></tr><tr class="total"><td>OMZET</td><td>${rupiah(total)}</td></tr><tr><td>Rata-rata</td><td>${rupiah(done.length?total/done.length:0)}</td></tr></table><div class="line"></div><div class="section">METODE PEMBAYARAN</div><table><tr><td>Tunai</td><td>${rupiah(cash)}</td></tr><tr><td>QRIS</td><td>${rupiah(qris)}</td></tr><tr><td>Transfer</td><td>${rupiah(transfer)}</td></tr><tr><td>Debit</td><td>${rupiah(debit)}</td></tr></table><div class="line"></div><div class="section">PRODUK TERJUAL</div><table>${itemRows}</table><div class="line"></div><div class="section">DAFTAR TRANSAKSI</div><table>${txRows}</table><div class="line"></div><p class="center small">Dicetak ${new Date().toLocaleString("id-ID")}</p><p class="center">${esc(S.settings.shopName||"POSTKU")}</p><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`);w.document.close()
}
function addUser(){openModal(`<h2>Tambah Kasir</h2><div class="field"><label>Username</label><input id="nu"></div><div class="field"><label>Password</label><input id="np" type="password"></div><button class="primary" style="width:100%" id="saveUser">Simpan</button>`);document.getElementById("saveUser").onclick=()=>{let u=document.getElementById("nu").value.trim(),p=document.getElementById("np").value;if(!u||!p||S.users.some(x=>x.username===u)){toast("Username kosong atau sudah dipakai");return}S.users.push({id:Date.now(),username:u,password:p,role:"cashier"});save();closeModal();renderSettings();toast("Kasir ditambahkan")}}
function testPrint(){const o={id:"TEST-001",date:new Date().toISOString(),buyer:"Test",cashier:current.username,items:[{name:"Contoh Produk",price:10000,qty:1}],total:10000,method:"Tunai",cash:10000,change:0};printReceipt(o)}
document.addEventListener("click",e=>{
 const nav=e.target.closest("[data-nav]");if(nav)go(nav.dataset.nav);
 const add=e.target.closest("[data-add]");if(add)addToCart(add.dataset.add);
 const choose=e.target.closest("[data-choose-variant]");if(choose){const p=S.products.find(x=>x.variants.some(v=>String(v.id)===String(choose.dataset.chooseVariant)));const v=p?.variants.find(x=>String(x.id)===String(choose.dataset.chooseVariant));if(p&&v)addVariantToCart(p,v)}
 const chip=e.target.closest("[data-cat]");if(chip){activeCat=chip.dataset.cat;renderKasir()}
 const plus=e.target.closest("[data-plus]"),minus=e.target.closest("[data-minus]");if(plus||minus){const key=plus?.dataset.plus||minus?.dataset.minus,i=findCartItem(key);if(i){if(plus){const p=S.products.find(x=>String(x.id)===String(i.id)),v=p?.variants.find(x=>String(x.id)===String(i.variantId));if(v&&i.qty<v.stock)i.qty++;else{toast("Jumlah melebihi stok");return}}else i.qty--;if(i.qty<=0)S.cart=S.cart.filter(x=>(x.key||`${x.id}::${x.variantId||""}`)!==key);save();renderKasir()}}
 const tab=e.target.closest("[data-status]");if(tab){orderFilter=tab.dataset.status;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));renderOrders()}
 const resume=e.target.closest("[data-resume]");if(resume)resumeOrder(resume.dataset.resume);
 const cancel=e.target.closest("[data-cancel]");if(cancel&&confirm("Batalkan pesanan ini?"))cancelOrder(cancel.dataset.cancel);
 const rep=e.target.closest("[data-reprint]");if(rep)printReceipt(S.orders.find(o=>o.id===rep.dataset.reprint));
 const vo=e.target.closest("[data-void]");if(vo&&confirm("Void transaksi ini?"))voidOrder(vo.dataset.void);
 const edit=e.target.closest("[data-edit]");if(edit)productModal(edit.dataset.edit);
 const del=e.target.closest("[data-delete]");if(del&&confirm("Hapus produk ini? Data transaksi lama tetap tersimpan.")){S.products=S.products.filter(p=>String(p.id)!==String(del.dataset.delete));S.cart=S.cart.filter(i=>String(i.id)!==String(del.dataset.delete));save();renderProducts();renderKasir();toast("Produk dihapus")}
 const ud=e.target.closest("[data-userdel]");if(ud&&confirm("Hapus kasir ini?")){S.users=S.users.filter(u=>u.id!=ud.dataset.userdel);save();renderSettings();toast("Kasir dihapus")}
});
document.getElementById("loginBtn").onclick=login;document.getElementById("loginPass").onkeydown=e=>{if(e.key==="Enter")login};document.getElementById("logoutBtn").onclick=logout;
window.addEventListener("DOMContentLoaded",()=>{ try{save()}catch{} if(!restoreLoginSession()) document.getElementById("loginUser")?.focus(); });
document.getElementById("buyerName").oninput=e=>{S.buyerName=e.target.value;save()};document.getElementById("tableNo").oninput=e=>{S.tableNo=e.target.value;save()};
document.getElementById("salesPeriod").onchange=()=>{const c=document.getElementById("salesChart");c.dataset.period=document.getElementById("salesPeriod").value;drawChart(c,+c.dataset.period)};
document.getElementById("reportPeriod").onchange=()=>renderReports();
const reportDate=document.getElementById("reportDate");if(reportDate)reportDate.value=todayKey();
document.getElementById("dailyReportBtn").onclick=printDailyReport;
document.getElementById("productSearch").oninput=renderKasir;document.getElementById("mobileCartBtn").onclick=()=>document.getElementById("cartPanel").scrollIntoView({behavior:"smooth",block:"start"});document.getElementById("clearCartBtn").onclick=()=>{if(confirm("Kosongkan keranjang?"))clearCart()};document.getElementById("checkoutBtn").onclick=openCheckout;document.getElementById("pendingBtn").onclick=createPending;
document.getElementById("addProductBtn").onclick=()=>productModal();document.getElementById("exportBtn").onclick=exportCSV;document.getElementById("backupBtn").onclick=backupData;document.getElementById("restoreBtn").onclick=()=>document.getElementById("restoreFile").click();document.getElementById("restoreFile").onchange=e=>restoreDataFile(e.target.files[0]);document.getElementById("saveSettingsBtn").onclick=saveSettings;document.getElementById("testPrintBtn").onclick=testPrint;document.getElementById("addUserBtn").onclick=addUser;
document.getElementById("qrisInput").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{S.settings.qris=r.result;document.getElementById("qrisPreview").src=r.result;document.getElementById("qrisPreview").classList.remove("hidden");save()};r.readAsDataURL(f)};
document.getElementById("modalClose").onclick=closeModal;document.getElementById("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
