// ============================================================
// DIAGNÓSTICO DE AGRUPAMENTO DE PARADAS - V6
// Mostra no console e tenta identificar endereços próximos
// ============================================================

function diagnosticoParadas(listaParadas){

    console.clear();

    console.log("===== PACOTE É MATO DIAGNÓSTICO =====");

    console.log("Total de paradas:", listaParadas.length);

    let multiplas = listaParadas.filter(
        p => (p.pacotes || []).length >= 2
    );

    console.log("Paradas múltiplas:", multiplas.length);


    console.log("===== PARADAS COM MÚLTIPLOS PACOTES =====");

    multiplas.forEach((p,i)=>{

        console.log(
            `${i+1} - ${p.endereco} | Pacotes: ${p.pacotes.length}`,
            p.pacotes
        );

    });


    console.log("===== FIM DIAGNÓSTICO =====");

    return listaParadas;
}


// Guarda uma cópia para inspeção sem alterar a rota
window.exportarDiagnosticoParadas = function(){

    if(window.paradas){

        console.table(
            window.paradas.map(p=>({
                endereco:p.endereco,
                pacotes:(p.pacotes||[]).length
            }))
        );

    }else{

        console.log("Lista de paradas ainda não encontrada.");

    }
};
