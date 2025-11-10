
const SITE = {
  brand: "AYM Propiedades",
  email: "alarconymatus@gmail.com",
  phones: ["+56 9 9000 3574","+56 9 9682 5523"],
  instagram: "https://www.instagram.com/alarconymatus.propiedades",
  facebook: "https://www.facebook.com/AYM Propiedades".replace(" ","%20"),
};

function $$(sel, ctx=document){ return ctx.querySelector(sel); }
function fmtCLP(n){
  try{
    if(typeof n === "string" && n.startsWith("UF")) return n;
    return new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP', maximumFractionDigits:0}).format(n);
  }catch(e){ return n; }
}

async function loadProps(){
  const res = await fetch('./data/properties.json?v=' + Date.now());
  return await res.json();
}

function cardHtml(p){
  const price = p.priceCLP ? fmtCLP(p.priceCLP) : (p.priceUF? `UF ${p.priceUF}` : "");
  const op = p.operation || "";
  const cover = p.cover || "https://picsum.photos/640/480?blur=1&random=" + encodeURIComponent(p.id);
  const short = p.summary || "";
  return `
  <article class="card">
    <a href="./property.html?id=${encodeURIComponent(p.id)}">
      <img src="${cover}" alt="${p.title}">
    </a>
    <div class="pad">
      <div class="badges">
        ${op? `<span class="badge">${op}</span>`:""}
        ${p.type? `<span class="badge">${p.type}</span>`:""}
        ${p.commune? `<span class="badge">${p.commune}</span>`:""}
        ${p.status? `<span class="badge">${p.status}</span>`:""}
      </div>
      <h3 style="margin:8px 0"><a href="./property.html?id=${encodeURIComponent(p.id)}">${p.title}</a></h3>
      <div class="price">${price}</div>
      <p class="small">${short}</p>
    </div>
  </article>`;
}

function renderHeader(){
  const logo = './assets/logo.png';
  return `
  <header class="header container">
    <img src="${logo}" alt="AYM Propiedades">
    <div class="brand">AYM Propiedades</div>
    <nav class="nav small">
      <a href="./">Inicio</a>
      <a href="#propiedades">Propiedades</a>
      <a href="#contacto">Contacto</a>
    </nav>
  </header>`;
}

function renderFooter(){
  return `
  <footer class="footer container">
    <hr/>
    <div class="row">
      <div class="col">
        <strong>AYM Propiedades</strong><br>
        Agentes inmobiliarios especializados en la V Región de Chile y alrededores.
      </div>
      <div class="col">
        <div><strong>Contacto</strong></div>
        <div>Email: <a href="mailto:${SITE.email}">${SITE.email}</a></div>
        <div>Tel: ${SITE.phones.join(" • ")}</div>
      </div>
      <div class="col">
        <div><strong>Redes</strong></div>
        <div><a href="${SITE.instagram}" target="_blank" rel="noopener">Instagram</a></div>
        <div><a href="${SITE.facebook}" target="_blank" rel="noopener">Facebook</a></div>
      </div>
    </div>
  </footer>`;
}

window.AYMPages = { renderHeader, renderFooter, loadProps, cardHtml, fmtCLP };
