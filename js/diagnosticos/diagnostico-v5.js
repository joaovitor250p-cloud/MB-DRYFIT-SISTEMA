// Validação universal de rota adicionada
window.PEMATO_DIAGNOSTICO = {
  ativo: true,
  resumo: function(pacotes, paradas){
    return {
      pacotesLidos: Array.isArray(pacotes)?pacotes.length:0,
      paradasGeradas: Array.isArray(paradas)?paradas.length:0,
      multiplas: Array.isArray(paradas)?paradas.filter(p=> (p.pacotes||[]).length>=2).length:0
    };
  }
};
