/*
 V19 - DIAGNÓSTICO DE AGRUPAMENTO
 Não altera a contagem.
 Mostra como cada parada foi interpretada.
*/

(function(){

window.mostrarDiagnosticoAgrupamentoV19 = function(lista){

    if(!Array.isArray(lista)){
        console.log("V19: lista de paradas não encontrada");
        return;
    }

    const resultado = lista.map((p,i)=>({
        parada: i+1,
        rua: p.ruaCanonica || p.rua || p.endereco || "",
        numero: p.numero || "",
        chave: p.chave || "",
        pacotes: Array.isArray(p.pacotes) ? p.pacotes.length : 0
    }));

    console.table(resultado);
    console.log("DIAGNÓSTICO V19", resultado);
};

})();
