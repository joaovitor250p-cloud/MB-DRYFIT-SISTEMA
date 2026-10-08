/*
 V18 - AGRUPAMENTO INTELIGENTE DE RUAS
 Melhora abreviações e pequenas diferenças de leitura do Circuit.
 Mantém número do imóvel como regra obrigatória.
*/

(function(){

window.ruasParecidasV18 = function(a,b){

 if(!a || !b) return false;

 let normalizar = s => String(s)
   .toLowerCase()
   .normalize("NFD")
   .replace(/[\u0300-\u036f]/g,"")
   .replace(/[^a-z0-9]/g,"");

 let x = normalizar(a);
 let y = normalizar(b);

 const troca = [
   ["mq","marques"],
   ["cnsol","conselheiro"],
   ["frgaspar","freigaspar"],
   ["sapucai","sapucaia"],
   ["taquary","taquari"]
 ];

 troca.forEach(([a,b])=>{
   if(x.startsWith(a)) x=b+x.slice(a.length);
   if(y.startsWith(a)) y=b+y.slice(a.length);
 });

 if(x===y) return true;

 let maior = Math.max(x.length,y.length);
 let menor = Math.min(x.length,y.length);

 return menor >= 6 && (x.includes(y) || y.includes(x)) && (menor/maior)>0.75;
};

})();
