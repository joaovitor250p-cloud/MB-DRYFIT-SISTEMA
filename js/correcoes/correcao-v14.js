// ============================================================
// V14 - PARSER DE ENDEREÇO REAL
// Extrai rua + número antes do agrupamento
// ============================================================

function extrairEnderecoReal(texto){

    if(!texto) return "";

    let e = String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/[_-]/g," ")
        .replace(/\s+/g," ")
        .trim();


    // abreviações comuns
    const mapa = {
        "mq":"marques",
        "cnsol":"conselheiro",
        "fr":"frei",
        "frgaspar":"frei gaspar",
        "r ":"rua ",
        "av ":"avenida "
    };

    Object.keys(mapa).forEach(k=>{
        e=e.replace(new RegExp("^"+k+"\\b"), mapa[k]);
    });


    // remove cidade
    e=e.replace(/saopaulo/g," ");


    // separa o número do imóvel (último número)
    let numeros=e.match(/\d+/g);
    let numero="";

    if(numeros && numeros.length){
        numero=numeros[numeros.length-1];
    }


    // remove complementos
    e=e.replace(
      /(apto|apartamento|ap|bloco|torre|sala|casa|fundos|lado|bl)\w*/g,
      " "
    );


    e=e.replace(/\d+/g," ")
        .replace(/\s+/g," ")
        .trim();


    return e.replace(/\s/g,"")+"_"+numero;
}


window.extrairEnderecoReal = extrairEnderecoReal;
