/*
============================================================
PACOTE É MATO V9
DIAGNÓSTICO INTEGRADO NO PROCESSAMENTO
============================================================

Este módulo tenta registrar os dados reais usados pelo app
durante a criação da rota.
*/

window.registroDiagnosticoRota = {
    pacotes: [],
    paradas: [],
    data: null
};


function salvarDiagnosticoRota(pacotes, paradas){

    window.registroDiagnosticoRota = {
        pacotes: pacotes || [],
        paradas: paradas || [],
        data: new Date().toLocaleString()
    };

    console.log(
        "DIAGNÓSTICO ROTA",
        window.registroDiagnosticoRota
    );
}


window.abrirDiagnosticoIntegrado = function(){

    const d = window.registroDiagnosticoRota;

    let html = `
    <h2>Diagnóstico Integrado</h2>
    <p><b>Pacotes:</b> ${d.pacotes.length}</p>
    <p><b>Paradas:</b> ${d.paradas.length}</p>
    <p><b>Data:</b> ${d.data || ""}</p>
    <hr>
    `;

    d.paradas.forEach((p,i)=>{

        html += `
        <div style="padding:10px;border-bottom:1px solid #444">
        <b>Parada ${i+1}</b><br>
        Endereço:
        ${p.endereco || p.address || "NÃO IDENTIFICADO"}
        <br>
        Pacotes:
        ${(p.pacotes || []).length}
        </div>
        `;

    });

    const janela = window.open(
        "",
        "diagnostico",
        "width=600,height=800"
    );

    janela.document.body.innerHTML = html;
};
