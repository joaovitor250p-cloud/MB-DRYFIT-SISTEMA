/*
 V26 - LIMPEZA DO ENDEREÇO BRUTO
 Remove sufixos internos do Circuit antes da criação da parada.
*/

(function(){

window.limparEnderecoBrutoV26 = function(valor){

    if(!valor) return "";

    return String(valor)
      .replace(/_s\d+/gi,"")
      .replace(/_x\d+/gi,"")
      .replace(/_s[a-z0-9]+/gi,"")
      .replace(/_x[a-z0-9]+/gi,"")
      .trim();
};

})();
