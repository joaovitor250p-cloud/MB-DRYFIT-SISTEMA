// ============================================================
// V13 - CHAVE REAL DE PARADA
// Corrige agrupamento antes da criação das paradas
// Regra: LOGRADOURO + NUMERO
// ============================================================

function criarChaveParadaCorreta(endereco){

    if(!endereco) return "";

    let e = String(endereco)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/[^a-z0-9 ]/g," ")
        .replace(/\s+/g," ")
        .trim();


    // abreviações comuns encontradas nos PDFs
    e = e
      .replace(/\bmq\b/g," marques ")
      .replace(/\bmarquesvalenca\b/g," marques valenca ")
      .replace(/\bcnsolafaiette\b/g," conselheiro lafaiette ")
      .replace(/\bfrgaspar\b/g," frei gaspar ");


    // remove complementos antes do número
    e = e.replace(
      /(apto|apartamento|ap|bloco|bl|torre|sala|casa|fundos|lado|t[0-9]).*?(?=[0-9])/g,
      " "
    );


    // captura número do imóvel no final
    let numero = "";

    let numeros = e.match(/\b\d+\b/g);

    if(numeros && numeros.length){
        numero = numeros[numeros.length-1];
    }


    // remove números de apartamento e mantém apenas rua
    let rua = e
      .replace(/\b\d+\b/g," ")
      .replace(/\s+/g," ")
      .trim();


    return (
      rua
      .replace(/\s/g,"")
      +
      "_"
      +
      numero
    );

}


// disponibiliza para o agrupador usar
window.criarChaveParadaCorreta = criarChaveParadaCorreta;
