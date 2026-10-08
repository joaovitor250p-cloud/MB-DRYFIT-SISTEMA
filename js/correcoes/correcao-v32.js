/*
 V32 - Base v27 + correção exclusiva de código interno Circuit

 Mantém a contagem original da v27.
 Corrige somente duplicidades causadas por sufixos:
 _s101, _s102, etc.
 Não faz agrupamento geral por rua/número.
*/

window.removerCodigoCircuitV32 = function(valor){
    if(!valor) return "";
    return String(valor)
      .replace(/_s\d+/gi,"")
      .replace(/_x\d+/gi,"")
      .trim();
};
