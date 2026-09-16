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
let S=load(); let current=null; let activeCat="Semua"; let orderFilter="all";
function load(){
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||"{}");
  const state={...structuredClone(defaultState),...saved};
  state.users=Array.isArray(saved.users)&&saved.users.length?structuredClone(saved.users):structuredClone(defaultState.users);
  let admin=state.users.find(u=>u.role==="admin");
  if(!admin){state.users.unshift({id:1,username:"navyabites",password:"Bakung2no47",role:"admin"})}
  else {admin.username="navyabites";admin.password="Bakung2no47";admin.role="admin"}
  state.products=Array.isArray(saved.products)?saved.products:structuredClone(defaultState.products);
  state.orders=Array.isArray(saved.orders)?saved.orders:[];
  state.cart=Array.isArray(saved.cart)?saved.cart:[];
  state.settings={...structuredClone(defaultState.settings),...(saved.settings||{})};
  return state;
 }catch{return structuredClone(defaultState)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
function rupiah(n){return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function toast(t){let x=document.getElementById("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1800)}
function isAdmin(){return current?.role==="admin"}
function login(){
 const u=document.getElementById("loginUser").value.trim(),p=document.getElementById("loginPass").value;
 const found=S.users.find(x=>x.username===u&&x.password===p);
 if(!found){document.getElementById("loginError").textContent="Username atau password salah.";return}
 current=found; document.getElementById("loginScreen").classList.add("hidden");document.getElementById("mainScreen").classList.remove("hidden");
 document.getElementById("currentUser").textContent=`${found.username} · ${found.role==="admin"?"Admin":"Kasir"}`;
 document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden",!isAdmin()));
 go("dashboard");
}
function logout(){current=null;document.getElementById("mainScreen").classList.add("hidden");document.getElementById("loginScreen").classList.remove("hidden");document.getElementById("loginPass").value=""}
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
 const cats=["Semua",...new Set(S.products.map(p=>p.cat))];document.getElementById("categoryBar").innerHTML=cats.map(c=>`<button class="chip ${activeCat===c?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
 const q=document.getElementById("productSearch").value.toLowerCase();
 const list=S.products.filter(p=>(activeCat==="Semua"||p.cat===activeCat)&&p.name.toLowerCase().includes(q));
 document.getElementById("productGrid").innerHTML=list.map(p=>`<button class="product-card" data-add="${p.id}"><img class="product-photo" src="${esc(p.img||placeholder())}" onerror="this.src='${placeholder()}'"><div class="product-info"><div class="product-name">${esc(p.name)}</div><div class="product-price">${rupiah(p.price)}</div></div></button>`).join("");
 document.getElementById("buyerName").value=S.buyerName||"";document.getElementById("tableNo").value=S.tableNo||"";renderCart();
}
function placeholder(){return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-size="28">POSTKU</text></svg>`)}
function addToCart(id){let p=S.products.find(x=>x.id==id),i=S.cart.find(x=>x.id==id);if(i)i.qty++;else S.cart.push({id:p.id,name:p.name,price:p.price,qty:1});save();renderCart()}
function renderCart(){const el=document.getElementById("cartItems");document.getElementById("cartCount").textContent=`${S.cart.reduce((a,x)=>a+x.qty,0)} item`;el.innerHTML=S.cart.map(i=>`<div class="cart-row"><div><b>${esc(i.name)}</b><span class="muted">${rupiah(i.price)} × ${i.qty}</span><div class="qty"><button data-minus="${i.id}">−</button><span>${i.qty}</span><button data-plus="${i.id}">+</button></div></div><b>${rupiah(i.price*i.qty)}</b></div>`).join("")||'<div class="muted" style="padding:25px 0;text-align:center">Keranjang kosong.</div>';document.getElementById("cartTotal").textContent=rupiah(S.cart.reduce((a,x)=>a+x.price*x.qty,0))}
function clearCart(){S.cart=[];S.buyerName="";S.tableNo="";save();renderCart()}
function cartTotal(){return S.cart.reduce((a,x)=>a+x.price*x.qty,0)}
function openCheckout(){
 if(!S.cart.length){toast("Keranjang masih kosong");return}
 openModal(`<h2>Pembayaran</h2><div class="field"><label>Nama pembeli</label><input id="payBuyer" value="${esc(document.getElementById("buyerName").value)}"></div><div class="field"><label>Metode pembayaran</label><select id="payMethod"><option>Tunai</option><option>QRIS</option><option>Transfer</option><option>Debit</option></select></div><div class="field" id="cashField"><label>Uang diterima</label><input id="cashReceived" type="number" inputmode="numeric" placeholder="${cartTotal()}"></div><div class="panel"><b>Total ${rupiah(cartTotal())}</b><div id="changeText" class="muted" style="margin-top:6px"></div></div><button class="primary" style="width:100%" id="confirmPay">Selesaikan & Cetak</button>`);
 const method=document.getElementById("payMethod");const cash=document.getElementById("cashReceived");const change=()=>{let c=+cash.value||0;document.getElementById("changeText").textContent=method.value==="Tunai"?`Kembalian: ${rupiah(Math.max(0,c-cartTotal()))}`:""};
 method.onchange=()=>{document.getElementById("cashField").classList.toggle("hidden",method.value!=="Tunai");change()};cash.oninput=change;document.getElementById("confirmPay").onclick=()=>finishPayment(method.value,+cash.value||0);
}
function finishPayment(method,cash){
 const total=cartTotal();if(method==="Tunai"&&cash<total){toast("Uang diterima kurang");return}
 const now=new Date();const order={id:"ORD-"+now.getTime().toString().slice(-8),date:now.toISOString(),buyer:document.getElementById("payBuyer").value.trim()||"Umum",table:document.getElementById("tableNo").value.trim(),items:structuredClone(S.cart),total,method,cash,change:Math.max(0,cash-total),status:"paid",cashier:current.username};
 S.orders.unshift(order);clearCart();closeModal();save();go("orders");setTimeout(()=>printReceipt(order,"receipt"),200);toast("Transaksi berhasil");}
function createPending(){if(!S.cart.length){toast("Keranjang masih kosong");return}const now=new Date();const o={id:"ORD-"+now.getTime().toString().slice(-8),date:now.toISOString(),buyer:document.getElementById("buyerName").value.trim()||"Umum",table:document.getElementById("tableNo").value.trim(),items:structuredClone(S.cart),total:cartTotal(),method:"-",cash:0,change:0,status:"pending",cashier:current.username};S.orders.unshift(o);clearCart();save();go("orders");toast("Pesanan disimpan sebagai pending")}
function renderOrders(){const arr=S.orders.filter(o=>orderFilter==="all"||o.status===orderFilter);document.getElementById("ordersList").innerHTML=arr.map(o=>`<div class="order-card"><div class="order-top"><div><b>${o.id}</b><div class="muted">${new Date(o.date).toLocaleString("id-ID")} · ${esc(o.buyer)}${o.table?` · Meja ${esc(o.table)}`:""}</div></div><span class="badge ${o.status}">${o.status==="paid"?"SELESAI":o.status==="pending"?"PENDING":"DIBATALKAN"}</span></div><div class="order-items">${o.items.map(i=>`${i.qty}× ${esc(i.name)}`).join(" · ")}</div><div><b>${rupiah(o.total)}</b> ${o.method!=="-"?`· ${esc(o.method)}`:""}</div><div class="order-actions" style="margin-top:12px">${o.status==="pending"?`<button class="primary" data-resume="${o.id}">Lanjutkan & Bayar</button><button class="secondary" data-cancel="${o.id}">Batalkan</button>`:""}${o.status==="paid"?`<button class="secondary" data-reprint="${o.id}">Cetak Ulang</button><button class="secondary" data-void="${o.id}">Void</button>`:""}</div></div>`).join("")||'<div class="panel muted">Belum ada pesanan.</div>'}
function resumeOrder(id){let o=S.orders.find(x=>x.id===id);S.cart=structuredClone(o.items);S.buyerName=o.buyer;S.tableNo=o.table;S.orders=S.orders.filter(x=>x.id!==id);save();go("kasir");toast("Pesanan dikembalikan ke keranjang")}
function cancelOrder(id){let o=S.orders.find(x=>x.id===id);if(!o)return;o.status="cancelled";save();renderOrders();toast("Pesanan dibatalkan")}
function voidOrder(id){if(!isAdmin()){toast("Hanya Admin yang dapat void");return}let o=S.orders.find(x=>x.id===id);if(!o)return;o.status="cancelled";o.voidedBy=current.username;save();renderOrders();toast("Transaksi di-void")}
function renderProducts(){document.getElementById("productsList").innerHTML=S.products.map(p=>`<div class="admin-product"><img src="${esc(p.img||placeholder())}" onerror="this.src='${placeholder()}'"><div class="grow"><b>${esc(p.name)}</b><div class="muted">${esc(p.cat)} · ${rupiah(p.price)}</div></div><button class="secondary" data-edit="${p.id}">Edit</button><button class="secondary" data-delete="${p.id}">Hapus</button></div>`).join("")}
function productModal(id=null){let p=id?S.products.find(x=>x.id==id):{name:"",price:"",cat:"Makanan",img:""};openModal(`<h2>${id?"Edit Produk":"Tambah Produk"}</h2><div class="field"><label>Nama produk</label><input id="pName" value="${esc(p.name)}"></div><div class="field"><label>Harga</label><input id="pPrice" type="number" value="${p.price}"></div><div class="field"><label>Kategori</label><input id="pCat" value="${esc(p.cat)}"></div><div class="field"><label>Foto produk</label><input id="pFile" type="file" accept="image/*"><img id="pPrev" class="qris-preview" src="${esc(p.img||placeholder())}"></div><button class="primary" style="width:100%" id="saveProduct">Simpan Produk</button>`);
 let img=p.img||"";document.getElementById("pFile").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{img=r.result;document.getElementById("pPrev").src=img};r.readAsDataURL(f)};
 document.getElementById("saveProduct").onclick=()=>{let name=document.getElementById("pName").value.trim(),price=+document.getElementById("pPrice").value,cat=document.getElementById("pCat").value.trim()||"Lainnya";if(!name||!price){toast("Lengkapi data produk");return}if(id){Object.assign(p,{name,price,cat,img})}else{S.products.push({id:Date.now(),name,price,cat,img})}save();closeModal();renderProducts();toast("Produk tersimpan")};
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
function openModal(html){document.getElementById("modalBody").innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function printReceipt(o,type="receipt"){const w=window.open("","_blank");if(!w){toast("Izinkan pop-up untuk mencetak");return}let size=S.settings.paperSize==="80"?"80mm":"58mm";let items=o.items.map(i=>`<tr><td>${i.qty}× ${esc(i.name)}</td><td>${rupiah(i.price*i.qty)}</td></tr>`).join("");w.document.write(`<html><head><title>${o.id}</title><style>@page{size:${size} auto;margin:0}body{font-family:monospace;width:${size};margin:0;padding:4mm;font-size:12px}h2{text-align:center;margin:0 0 4px}p{margin:3px 0}table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}td:last-child{text-align:right}.line{border-top:1px dashed #000;margin:7px 0}.center{text-align:center}</style></head><body><h2>${esc(S.settings.shopName||"POSTKU")}</h2><p class="center">${esc(S.settings.shopAddress||"")}</p><div class="line"></div><p>Order: ${o.id}</p><p>Pembeli: ${esc(o.buyer)}</p><p>Kasir: ${esc(o.cashier)}</p><p>${new Date(o.date).toLocaleString("id-ID")}</p><div class="line"></div><table>${items}</table><div class="line"></div><table><tr><td><b>TOTAL</b></td><td><b>${rupiah(o.total)}</b></td></tr>${o.method!=="-"?`<tr><td>${esc(o.method)}</td><td>${rupiah(o.cash)}</td></tr><tr><td>Kembali</td><td>${rupiah(o.change)}</td></tr>`:""}</table><div class="line"></div><p class="center">Terima kasih</p><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`);w.document.close()}
function exportCSV(){let rows=[["ID","Tanggal","Pembeli","Kasir","Status","Metode","Total"],...S.orders.map(o=>[o.id,o.date,o.buyer,o.cashier,o.status,o.method,o.total])];let csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="postku-laporan.csv";a.click();URL.revokeObjectURL(a.href)}
function addUser(){openModal(`<h2>Tambah Kasir</h2><div class="field"><label>Username</label><input id="nu"></div><div class="field"><label>Password</label><input id="np" type="password"></div><button class="primary" style="width:100%" id="saveUser">Simpan</button>`);document.getElementById("saveUser").onclick=()=>{let u=document.getElementById("nu").value.trim(),p=document.getElementById("np").value;if(!u||!p||S.users.some(x=>x.username===u)){toast("Username kosong atau sudah dipakai");return}S.users.push({id:Date.now(),username:u,password:p,role:"cashier"});save();closeModal();renderSettings();toast("Kasir ditambahkan")}}
function testPrint(){const o={id:"TEST-001",date:new Date().toISOString(),buyer:"Test",cashier:current.username,items:[{name:"Contoh Produk",price:10000,qty:1}],total:10000,method:"Tunai",cash:10000,change:0};printReceipt(o)}
document.addEventListener("click",e=>{
 const nav=e.target.closest("[data-nav]");if(nav)go(nav.dataset.nav);
 const add=e.target.closest("[data-add]");if(add)addToCart(add.dataset.add);
 const chip=e.target.closest("[data-cat]");if(chip){activeCat=chip.dataset.cat;renderKasir()}
 const plus=e.target.closest("[data-plus]"),minus=e.target.closest("[data-minus]");if(plus||minus){let id=+(plus?.dataset.plus||minus?.dataset.minus),i=S.cart.find(x=>x.id===id);if(i){if(plus)i.qty++;else i.qty--;if(i.qty<=0)S.cart=S.cart.filter(x=>x.id!==id);save();renderCart()}}
 const tab=e.target.closest("[data-status]");if(tab){orderFilter=tab.dataset.status;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));renderOrders()}
 const resume=e.target.closest("[data-resume]");if(resume)resumeOrder(resume.dataset.resume);
 const cancel=e.target.closest("[data-cancel]");if(cancel&&confirm("Batalkan pesanan ini?"))cancelOrder(cancel.dataset.cancel);
 const rep=e.target.closest("[data-reprint]");if(rep)printReceipt(S.orders.find(o=>o.id===rep.dataset.reprint));
 const vo=e.target.closest("[data-void]");if(vo&&confirm("Void transaksi ini?"))voidOrder(vo.dataset.void);
 const edit=e.target.closest("[data-edit]");if(edit)productModal(edit.dataset.edit);
 const del=e.target.closest("[data-delete]");if(del&&confirm("Hapus produk?")){S.products=S.products.filter(p=>p.id!=del.dataset.delete);save();renderProducts();toast("Produk dihapus")}
 const ud=e.target.closest("[data-userdel]");if(ud&&confirm("Hapus kasir ini?")){S.users=S.users.filter(u=>u.id!=ud.dataset.userdel);save();renderSettings();toast("Kasir dihapus")}
});
document.getElementById("loginBtn").onclick=login;document.getElementById("loginPass").onkeydown=e=>{if(e.key==="Enter")login};document.getElementById("logoutBtn").onclick=logout;
document.getElementById("salesPeriod").onchange=()=>{const c=document.getElementById("salesChart");c.dataset.period=document.getElementById("salesPeriod").value;drawChart(c,+c.dataset.period)};
document.getElementById("reportPeriod").onchange=()=>renderReports();
document.getElementById("productSearch").oninput=renderKasir;document.getElementById("clearCartBtn").onclick=()=>{if(confirm("Kosongkan keranjang?"))clearCart()};document.getElementById("checkoutBtn").onclick=openCheckout;document.getElementById("pendingBtn").onclick=createPending;
document.getElementById("addProductBtn").onclick=()=>productModal();document.getElementById("exportBtn").onclick=exportCSV;document.getElementById("saveSettingsBtn").onclick=saveSettings;document.getElementById("testPrintBtn").onclick=testPrint;document.getElementById("addUserBtn").onclick=addUser;
document.getElementById("qrisInput").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{S.settings.qris=r.result;document.getElementById("qrisPreview").src=r.result;document.getElementById("qrisPreview").classList.remove("hidden");save()};r.readAsDataURL(f)};
document.getElementById("modalClose").onclick=closeModal;document.getElementById("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
