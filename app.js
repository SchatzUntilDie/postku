const KEY='postku-data-v1';
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{
 products:[
  {id:1,name:'Nasi Goreng',price:15000,category:'Makanan'},
  {id:2,name:'Mie Goreng',price:13000,category:'Makanan'},
  {id:3,name:'Ayam Geprek',price:17000,category:'Makanan'},
  {id:4,name:'Es Teh',price:5000,category:'Minuman'},
  {id:5,name:'Es Jeruk',price:7000,category:'Minuman'},
  {id:6,name:'Kopi',price:8000,category:'Minuman'}
 ],
 orders:[], settings:{store:'POSTKU',footer:'Terima kasih'}
};
let cart=[], currentCat='Semua', payMethod='Tunai', editingId=null;
function saveDB(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
function rupiah(n){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n)}
function showPage(id){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById(id).classList.add('active');renderAll();scrollTo(0,0)}
function categories(){return ['Semua',...new Set(db.products.map(p=>p.category))]}
function renderCashier(){
 document.getElementById('categories').innerHTML=categories().map(c=>`<button class="${c===currentCat?'active':''}" onclick="currentCat='${c}';renderCashier()">${c}</button>`).join('');
 let ps=db.products.filter(p=>currentCat==='Semua'||p.category===currentCat);
 document.getElementById('products').innerHTML=ps.map(p=>`<button class="product" onclick="addCart(${p.id})"><b>${p.name}</b><span class="price">${rupiah(p.price)}</span></button>`).join('');
 document.getElementById('cartItems').innerHTML=cart.length?cart.map(i=>`<div class="cart-row"><span>${i.name}<br><small>${rupiah(i.price)}</small></span><span class="qty"><button onclick="changeQty(${i.id},-1)">−</button> ${i.qty} <button onclick="changeQty(${i.id},1)">+</button></span><b>${rupiah(i.price*i.qty)}</b></div>`).join(''):'<p>Belum ada item.</p>';
 document.getElementById('cartTotal').textContent=rupiah(total());
}
function addCart(id){let p=db.products.find(x=>x.id===id),i=cart.find(x=>x.id===id);i?i.qty++:cart.push({...p,qty:1});renderCashier()}
function changeQty(id,d){let i=cart.find(x=>x.id===id);if(!i)return;i.qty+=d;if(i.qty<=0)cart=cart.filter(x=>x.id!==id);renderCashier()}
function clearCart(){cart=[];document.getElementById('note').value='';renderCashier()}
function total(){return cart.reduce((s,i)=>s+i.price*i.qty,0)}
function openPayment(){if(!cart.length)return alert('Keranjang masih kosong.');document.getElementById('payTotal').textContent=rupiah(total());document.getElementById('paymentModal').classList.remove('hidden');setMethod('Tunai')}
function closePayment(){document.getElementById('paymentModal').classList.add('hidden')}
function setMethod(m){payMethod=m;document.getElementById('selectedMethod').textContent='Metode: '+m;document.getElementById('cashBox').style.display=m==='Tunai'?'block':'none';calcChange()}
function calcChange(){let cash=Number(document.getElementById('cashReceived').value||0);document.getElementById('change').textContent=rupiah(Math.max(0,cash-total()))}
function finishPayment(){
 let t=total(),cash=payMethod==='Tunai'?Number(document.getElementById('cashReceived').value||0):t;
 if(payMethod==='Tunai'&&cash<t)return alert('Uang diterima kurang.');
 let order={id:Date.now(),number:(db.orders.length+1).toString().padStart(5,'0'),date:new Date().toISOString(),items:cart.map(({id,name,price,qty})=>({id,name,price,qty})),total:t,method:payMethod,cash,change:cash-t,note:document.getElementById('note').value};
 db.orders.unshift(order);saveDB();cart=[];document.getElementById('note').value='';document.getElementById('cashReceived').value='';closePayment();showPage('history');alert('Transaksi berhasil. Nomor order #'+order.number);
}
function renderMenu(){document.getElementById('menuList').innerHTML=db.products.map(p=>`<div class="list-row"><div><b>${p.name}</b><br><small>${p.category} · ${rupiah(p.price)}</small></div><div><button class="ghost" onclick="openProductForm(${p.id})">Edit</button><button class="danger" onclick="deleteProduct(${p.id})">Hapus</button></div></div>`).join('')}
function openProductForm(id=null){editingId=id;let p=db.products.find(x=>x.id===id);document.getElementById('formTitle').textContent=id?'Edit Produk':'Tambah Produk';document.getElementById('pName').value=p?.name||'';document.getElementById('pPrice').value=p?.price||'';document.getElementById('pCategory').value=p?.category||'Makanan';document.getElementById('productModal').classList.remove('hidden')}
function closeProductForm(){document.getElementById('productModal').classList.add('hidden')}
function saveProduct(){let name=document.getElementById('pName').value.trim(),price=Number(document.getElementById('pPrice').value),category=document.getElementById('pCategory').value.trim()||'Lainnya';if(!name||!price)return alert('Nama dan harga wajib diisi.');if(editingId){Object.assign(db.products.find(x=>x.id===editingId),{name,price,category})}else db.products.push({id:Date.now(),name,price,category});closeProductForm();saveDB()}
function deleteProduct(id){if(confirm('Hapus produk ini?')){db.products=db.products.filter(p=>p.id!==id);saveDB()}}
function renderHistory(){document.getElementById('historyList').innerHTML=db.orders.length?db.orders.map(o=>`<div class="list-row"><div><b>#${o.number}</b><br><small>${new Date(o.date).toLocaleString('id-ID')} · ${o.method}</small></div><div><b>${rupiah(o.total)}</b><br><button class="ghost" onclick="printReceipt(${o.id})">Cetak</button></div></div>`).join(''):'<div class="card">Belum ada transaksi.</div>'}
function renderReports(){let now=new Date(),today=db.orders.filter(o=>{let d=new Date(o.date);return d.toDateString()===now.toDateString()}),month=db.orders.filter(o=>{let d=new Date(o.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});let sum=a=>a.reduce((s,o)=>s+o.total,0);document.getElementById('reportToday').textContent=rupiah(sum(today));document.getElementById('reportMonth').textContent=rupiah(sum(month));let pm={};db.orders.forEach(o=>pm[o.method]=(pm[o.method]||0)+o.total);document.getElementById('paymentReport').innerHTML=Object.entries(pm).map(([k,v])=>`<div class="list-row"><span>${k}</span><b>${rupiah(v)}</b></div>`).join('')||'<p>Belum ada data.</p>';let bp={};db.orders.forEach(o=>o.items.forEach(i=>bp[i.name]=(bp[i.name]||0)+i.qty));document.getElementById('bestProducts').innerHTML=Object.entries(bp).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`<div class="list-row"><span>${k}</span><b>${v} terjual</b></div>`).join('')||'<p>Belum ada data.</p>'}
function renderDashboard(){let now=new Date(),today=db.orders.filter(o=>new Date(o.date).toDateString()===now.toDateString()),sum=today.reduce((s,o)=>s+o.total,0);document.getElementById('todaySales').textContent=rupiah(sum);document.getElementById('todayOrders').textContent=today.length;document.getElementById('avgOrder').textContent=rupiah(today.length?sum/today.length:0);document.getElementById('storeName').textContent=db.settings.store}
function renderSettings(){document.getElementById('storeInput').value=db.settings.store;document.getElementById('footerInput').value=db.settings.footer}
function saveSettings(){db.settings.store=document.getElementById('storeInput').value.trim()||'POSTKU';db.settings.footer=document.getElementById('footerInput').value.trim();saveDB();alert('Pengaturan disimpan.')}
function printReceipt(id){let o=db.orders.find(x=>x.id===id);let w=open('','_blank');w.document.write(`<html><head><title>Struk #${o.number}</title><style>body{font-family:monospace;width:58mm;margin:0;padding:8px}h3{text-align:center}hr{border:0;border-top:1px dashed #000}div{display:flex;justify-content:space-between}</style></head><body><h3>${db.settings.store}</h3><div>#${o.number}<span>${new Date(o.date).toLocaleString('id-ID')}</span></div><hr>${o.items.map(i=>`<div><span>${i.name} x${i.qty}</span><span>${rupiah(i.price*i.qty)}</span></div>`).join('')}<hr><div><b>TOTAL</b><b>${rupiah(o.total)}</b></div><div>Pembayaran: ${o.method}</div>${o.method==='Tunai'?`<div>Dibayar: ${rupiah(o.cash)}</div><div>Kembali: ${rupiah(o.change)}</div>`:''}<hr><p style="text-align:center">${db.settings.footer}</p><script>window.print()</script></body></html>`);w.document.close()}
function renderAll(){renderDashboard();renderCashier();renderMenu();renderHistory();renderReports();renderSettings()}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.getElementById('installBtn').classList.remove('hidden')});document.getElementById('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}};
renderAll();
