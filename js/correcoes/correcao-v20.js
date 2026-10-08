/*
 V20 - CORREÇÃO ESPECÍFICA DE LOGRADOUROS
 Ajusta abreviações identificadas no diagnóstico.
*/

(function(){

window.normalizarRuaV20 = function(rua){

    if(!rua) return "";

    let r = String(rua)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]/g,"");

    const regras = {
        "cnsolafaiette":"conselheirolafaiette",
        "cnsolafayette":"conselheirolafaiette",
        "mqvalenca":"marquesvalenca",
        "frgaspar":"freigaspar"
    };

    Object.keys(regras).forEach(k=>{
        if(r.startsWith(k)){
            r = regras[k] + r.slice(k.length);
        }
    });

    return r;
};

})();
