
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const CHAO = 440;

const GRAVIDADE = 0.42;
const RAIO_BOLA = 11;

let pontos1 = 0;
let pontos2 = 0;
let mensagem = "Pule na hora certa para disputar a bola!";
let tempoMensagem = 180;
let pausaCesta = 0;
let quadro = 0;

// --------------------------------------------------
// JOGADORES
// --------------------------------------------------

function criarJogador(x, cor, numero, equipe) {
    return {
        x,
        y: CHAO - 76,
        largura: 34,
        altura: 76,

        cor,
        numero,
        equipe,

        // Animação automática do corpo
        fase: Math.random() * Math.PI * 2,
        direcaoBalanço: 1,
        inclinacao: 0,

        // Física do salto
        vx: 0,
        vy: 0,
        noChao: true,
        defesa: 0,
        tempoRoubo: 0
    };
}

const jogador1 = criarJogador(125, "#ed4054", "7", 1);
const jogador2 = criarJogador(740, "#f5c32b",  "23", 2);

// --------------------------------------------------
// CESTAS
// --------------------------------------------------

const cestaEsquerda = {
    x: 72,
    y: 205,
    tabelaX: 42,
    tabelaY: 148,
    tabelaLargura: 8,
    tabelaAltura: 57
};

const cestaDireita = {
    x: 828,
    y: 205,
    tabelaX: 850,
    tabelaY: 148,
    tabelaLargura: 8,
    tabelaAltura: 57
};

// --------------------------------------------------
// BOLA
// --------------------------------------------------

const bola = {
    x: W / 2,
    y: CHAO - RAIO_BOLA,
    raio: RAIO_BOLA,

    vx: 0,
    vy: 0,

    dono: null,
    voando: false,
    arremessador: null,

    yAnterior: 0,
    tempoProtecao: 0,
    ultimaCesta: null
};

// --------------------------------------------------
// CONTROLES: UMA TECLA POR JOGADOR
// --------------------------------------------------

document.addEventListener("keydown", (evento) => {
    if (evento.repeat) return;

    const tecla = evento.key.toLowerCase();

    if (tecla === "w") {
        evento.preventDefault();
        acaoJogador(jogador1);
    }

    if (evento.key === "ArrowUp") {
        evento.preventDefault();
        acaoJogador(jogador2);
    }
});

function acaoJogador(jogador) {
    if (pausaCesta > 0) return;

    // A mesma tecla serve para saltar e arremessar.
    if (bola.dono === jogador) {
        saltar(jogador);
        fazerArremesso(jogador);
        return;
    }

    // Se estiver sem a bola, salta para disputá-la,
    // tentar roubá-la ou bloquear um arremesso.
    saltar(jogador);
}

function saltar(jogador) {
    if (!jogador.noChao) return;

    jogador.noChao = false;

    // Impulso vertical inicial.
    jogador.vy = -11.5;

    // O salto avança na direção do balanço atual.
    jogador.vx = jogador.direcaoBalanço * 5.5;

    // Mantém a tentativa de defesa ativa durante o salto.
    jogador.defesa = 30;
}

// --------------------------------------------------
// ARREMESSO
// --------------------------------------------------

function fazerArremesso(jogador) {
    if (bola.dono !== jogador) return;

    bola.dono = null;
    bola.voando = true;
    bola.arremessador = jogador;
    bola.tempoProtecao = 8;

    const cestaAlvo = jogador === jogador1
        ? cestaDireita
        : cestaEsquerda;

    const dx = cestaAlvo.x - bola.x;
    const distanciaHorizontal = Math.abs(dx);

    // Ajusta o impulso para a bola fazer um arco.
    // Mais distância exige maior velocidade horizontal.
    const direcao = Math.sign(dx) || jogador.equipe;

    bola.x = jogador.x + jogador.largura / 2
        + direcao * 18;

    bola.y = jogador.y + 27;

    bola.vx = direcao * Math.min(
        10,
        Math.max(6.5, distanciaHorizontal / 48)
    );

    bola.vy = -13.5;

    mensagem = "ARREMESSO!";
    tempoMensagem = 70;
}

// --------------------------------------------------
// ANIMAÇÃO E FÍSICA DOS JOGADORES
// --------------------------------------------------

function atualizarJogador(jogador) {
    // Balanço mais forte e visível.
    jogador.fase += 0.105;

    jogador.direcaoBalanço =
        Math.cos(jogador.fase) >= 0 ? 1 : -1;

    // O tronco acompanha o balanço.
    const balanço = Math.sin(jogador.fase);

    jogador.inclinacao = balanço * 0.22;

    // Pequena oscilação horizontal enquanto está no chão.
    if (jogador.noChao) {
        jogador.x += balanço * 0.18;
    }

    // Gravidade e movimento durante o salto.
    jogador.vy += GRAVIDADE;
    jogador.y += jogador.vy;
    jogador.x += jogador.vx;

    // Resistência do ar.
    jogador.vx *= 0.985;

    // Limites da quadra.
    jogador.x = Math.max(
        4,
        Math.min(W - jogador.largura - 4, jogador.x)
    );

    // Aterrissagem.
    if (jogador.y + jogador.altura >= CHAO) {
        jogador.y = CHAO - jogador.altura;

        jogador.vy = 0;
        jogador.vx = 0;
        jogador.noChao = true;
    }

    if (jogador.defesa > 0) {
        jogador.defesa--;
    }

    if (jogador.tempoRoubo > 0) {
        jogador.tempoRoubo--;
    }
}

// --------------------------------------------------
// POSIÇÃO DAS MÃOS
// --------------------------------------------------

function obterMao(jogador) {
    const direcao = jogador.direcaoBalanço;

    return {
        x: jogador.x + jogador.largura / 2
            + direcao * 25,
        y: jogador.y + 33
            + Math.sin(jogador.fase) * 5
    };
}

function distancia(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

// --------------------------------------------------
// PEGAR A BOLA
// --------------------------------------------------

function tentarPegarBola(jogador) {
    if (bola.dono !== null || pausaCesta > 0) {
        return false;
    }

    const centroX = jogador.x + jogador.largura / 2;
    const centroY = jogador.y + jogador.altura / 2;

    const distanciaCorpo = distancia(
        centroX,
        centroY,
        bola.x,
        bola.y
    );

    const mao = obterMao(jogador);

    const distanciaMao = distancia(
        mao.x,
        mao.y,
        bola.x,
        bola.y
    );

    // Área maior para pegar a bola solta.
    // A mão alcança mais longe do que o corpo.
    const alcanceCorpo = bola.voando ? 48 : 68;
    const alcanceMao = bola.voando ? 43 : 58;

    if (
        distanciaCorpo <= alcanceCorpo ||
        distanciaMao <= alcanceMao
    ) {
        bola.dono = jogador;
        bola.voando = false;
        bola.arremessador = null;

        bola.vx = 0;
        bola.vy = 0;
        bola.tempoProtecao = 10;

        mensagem = jogador === jogador1
            ? "JOGADOR 1 PEGOU A BOLA!"
            : "JOGADOR 2 PEGOU A BOLA!";

        tempoMensagem = 60;

        return true;
    }

    return false;
}

// --------------------------------------------------
// ROUBAR A BOLA
// --------------------------------------------------

function tentarRoubarBola(defensor) {
    if (!defensor.defesa || defensor.tempoRoubo > 0) {
        return false;
    }

    if (!bola.dono || bola.dono === defensor) {
        return false;
    }

    const mao = obterMao(defensor);

    const distanciaMao = distancia(
        mao.x,
        mao.y,
        bola.x,
        bola.y
    );

    // O defensor precisa alcançar a bola com a mão.
    if (distanciaMao > 34) return false;

    bola.dono = defensor;
    bola.voando = false;
    bola.arremessador = null;

    bola.vx = 0;
    bola.vy = 0;

    defensor.tempoRoubo = 35;

    mensagem = defensor === jogador1
        ? "ROUBADA DO JOGADOR 1!"
        : "ROUBADA DO JOGADOR 2!";

    tempoMensagem = 85;

    return true;
}

// --------------------------------------------------
// BLOQUEAR UM ARREMESSO
// --------------------------------------------------

function tentarBloquear(defensor) {
    if (!bola.voando || !bola.arremessador) {
        return false;
    }

    if (bola.arremessador === defensor) {
        return false;
    }

    // Precisa estar no ar e ainda no tempo do salto.
    if (defensor.noChao || defensor.defesa <= 0) {
        return false;
    }

    const mao = obterMao(defensor);

    const distanciaMao = distancia(
        mao.x,
        mao.y,
        bola.x,
        bola.y
    );

    if (distanciaMao > bola.raio + 17) {
        return false;
    }

    // O toque desvia a bola.
    bola.vx = defensor.x < bola.x ? 5.5 : -5.5;
    bola.vy = -6.5;

    bola.voando = false;
    bola.arremessador = null;
    bola.tempoProtecao = 0;

    mensagem = "TOCO! ARREMESSO BLOQUEADO!";
    tempoMensagem = 90;

    return true;
}

// --------------------------------------------------
// COLISÕES FÍSICAS
// --------------------------------------------------

function colidirPonto(x, y, raio, px, py, forca) {
    const dx = x - px;
    const dy = y - py;
    const distanciaCentros = Math.hypot(dx, dy);

    const limite = raio + forca;

    if (distanciaCentros >= limite || distanciaCentros === 0) {
        return false;
    }

    const nx = dx / distanciaCentros;
    const ny = dy / distanciaCentros;

    // Separa a bola do objeto.
    bola.x = px + nx * limite;
    bola.y = py + ny * limite;

    // Reflexão da velocidade na normal de colisão.
    const velocidadeNormal =
        bola.vx * nx + bola.vy * ny;

    if (velocidadeNormal < 0) {
        bola.vx -= 1.65 * velocidadeNormal * nx;
        bola.vy -= 1.65 * velocidadeNormal * ny;

        // Pequena perda de energia no impacto.
        bola.vx *= 0.88;
        bola.vy *= 0.88;
    }

    return true;
}

function colidirTabela(cesta) {
    const esquerda = cesta.tabelaX;
    const direita = cesta.tabelaX + cesta.tabelaLargura;
    const topo = cesta.tabelaY;
    const baixo = cesta.tabelaY + cesta.tabelaAltura;

    const pontoX = Math.max(esquerda, Math.min(bola.x, direita));
    const pontoY = Math.max(topo, Math.min(bola.y, baixo));

    const dx = bola.x - pontoX;
    const dy = bola.y - pontoY;

    if (dx * dx + dy * dy >= bola.raio * bola.raio) {
        return;
    }

    // Desvia a bola conforme o lado da tabela atingido.
    if (Math.abs(dx) > Math.abs(dy)) {
        bola.x = pontoX + Math.sign(dx || 1) * bola.raio;
        bola.vx *= -0.78;
    } else {
        bola.y = pontoY + Math.sign(dy || 1) * bola.raio;
        bola.vy *= -0.72;
    }

    bola.vx *= 0.96;
}

// Colisão com os dois segmentos do aro,
// deixando um espaço central para a bola passar.
function colidirAro(cesta) {
    const y = cesta.y;
    const x = cesta.x;

    colidirPonto(
        bola.x, bola.y, bola.raio,
        x - 20, y, 4
    );

    colidirPonto(
        bola.x, bola.y, bola.raio,
        x + 20, y, 4
    );
}

// --------------------------------------------------
// PONTUAÇÃO
// --------------------------------------------------

function verificarCesta() {
    if (!bola.voando || !bola.arremessador) {
        return false;
    }

    const cestaAlvo = bola.arremessador === jogador1
        ? cestaDireita
        : cestaEsquerda;

    // A bola precisa cruzar o plano do aro de cima para baixo.
    const cruzouAro =
        bola.yAnterior < cestaAlvo.y &&
        bola.y >= cestaAlvo.y &&
        bola.vy > 0;

    // Tolerância estreita para exigir que a bola passe
    // pelo centro da cesta.
    const entrouNoAro =
        Math.abs(bola.x - cestaAlvo.x) < 12;

    if (cruzouAro && entrouNoAro) {
        if (bola.arremessador === jogador1) {
            pontos1 += 2;
        } else {
            pontos2 += 2;
        }

        mensagem = "CESTA! +2 PONTOS!";
        tempoMensagem = 120;

        bola.dono = null;
        bola.voando = false;
        bola.arremessador = null;

        bola.vx = 0;
        bola.vy = 0;

        bola.x = W / 2;
        bola.y = CHAO - RAIO_BOLA;

        pausaCesta = 70;

        return true;
    }

    return false;
}

// --------------------------------------------------
// ATUALIZAÇÃO DA BOLA
// --------------------------------------------------

function atualizarBola() {
    if (bola.tempoProtecao > 0) {
        bola.tempoProtecao--;
    }

    if (bola.dono) {
        const mao = obterMao(bola.dono);

        bola.x = mao.x;
        bola.y = mao.y;

        // O adversário pode tentar roubar enquanto
        // a bola está na posse do outro jogador.
        tentarRoubarBola(
            bola.dono === jogador1 ? jogador2 : jogador1
        );

        return;
    }

    bola.yAnterior = bola.y;

    // Física do voo.
    bola.vy += GRAVIDADE;

    // Resistência do ar.
    bola.vx *= 0.999;

    bola.x += bola.vx;
    bola.y += bola.vy;

    // Bloqueio durante o voo.
    if (bola.tempoProtecao === 0) {
        if (tentarBloquear(jogador1)) return;
        if (tentarBloquear(jogador2)) return;
    }

    // Tabelas e aros.
    colidirTabela(cestaEsquerda);
    colidirTabela(cestaDireita);

    colidirAro(cestaEsquerda);
    colidirAro(cestaDireita);

    // Pontuação antes da colisão com o chão.
    if (verificarCesta()) return;

    // Rebote no piso.
    if (bola.y + bola.raio >= CHAO) {
        bola.y = CHAO - bola.raio;

        bola.vy *= -0.70;
        bola.vx *= 0.91;

        if (Math.abs(bola.vy) < 1.5) {
            bola.vy = 0;
        }

        if (Math.abs(bola.vx) < 0.18) {
            bola.vx = 0;
        }

        if (bola.vy === 0 && bola.vx === 0) {
            bola.voando = false;
            bola.arremessador = null;
        }
    }

    // Paredes laterais.
    if (bola.x - bola.raio < 0) {
        bola.x = bola.raio;
        bola.vx = Math.abs(bola.vx) * 0.75;
    }

    if (bola.x + bola.raio > W) {
        bola.x = W - bola.raio;
        bola.vx = -Math.abs(bola.vx) * 0.75;
    }

    // Pegar a bola solta: alcance aumentado.
    if (bola.tempoProtecao === 0) {
        if (tentarPegarBola(jogador1)) return;
        if (tentarPegarBola(jogador2)) return;
    }

    // Se a bola sair da área visível, reposiciona.
    if (bola.y > H + 80) {
        bola.x = W / 2;
        bola.y = CHAO - RAIO_BOLA;

        bola.vx = 0;
        bola.vy = 0;

        bola.voando = false;
        bola.arremessador = null;
    }
}

// --------------------------------------------------
// DESENHO DO CENÁRIO
// --------------------------------------------------

function desenharQuadra() {
    // Céu
    ctx.fillStyle = "#9cebf0";
    ctx.fillRect(0, 0, W, H);

    // Silhueta dos prédios
    ctx.fillStyle = "#8bd8df";

    for (let i = 0; i < 18; i++) {
        const x = i * 53;
        const altura = 45 + ((i * 37) % 75);

        ctx.fillRect(x, 150 - altura / 3, 35, altura);
    }

    // Gramado
    ctx.fillStyle = "#87c84a";
    ctx.fillRect(0, 190, W, 35);

    // Cerca
    ctx.fillStyle = "#b58d70";
    ctx.fillRect(0, 190, W, 38);

    ctx.strokeStyle = "#916c55";
    ctx.lineWidth = 2;

    for (let x = 0; x < W; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 190);
        ctx.lineTo(x, 228);
        ctx.stroke();
    }

    // Piso
    ctx.fillStyle = "#505252";
    ctx.fillRect(0, 225, W, H - 225);

    // Linhas da quadra
    ctx.strokeStyle = "#bfc4c4";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(80, 230);
    ctx.lineTo(30, 315);
    ctx.lineTo(870, 315);
    ctx.lineTo(820, 230);
    ctx.stroke();

    ctx.strokeRect(65, 235, 105, 65);
    ctx.strokeRect(730, 235, 105, 65);
}

// --------------------------------------------------
// DESENHO DAS CESTAS
// --------------------------------------------------

function desenharCesta(cesta, esquerda) {
    // Poste
    const posteX = esquerda ? 25 : W - 33;

    ctx.fillStyle = "#e3e3e3";
    ctx.fillRect(posteX, 125, 8, 155);

    // Tabela
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
        cesta.tabelaX - 4,
        cesta.tabelaY,
        cesta.tabelaLargura + 8,
        cesta.tabelaAltura
    );

    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 2;
    ctx.strokeRect(
        cesta.tabelaX - 4,
        cesta.tabelaY,
        cesta.tabelaLargura + 8,
        cesta.tabelaAltura
    );

    // Aro
    ctx.strokeStyle = "#f04432";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(cesta.x - 20, cesta.y);
    ctx.lineTo(cesta.x + 20, cesta.y);
    ctx.stroke();

    // Rede
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;

    for (let i = 0; i <= 4; i++) {
        const x = cesta.x - 17 + i * 8.5;

        ctx.beginPath();
        ctx.moveTo(x, cesta.y + 2);
        ctx.lineTo(
            cesta.x + (i - 2) * 5,
            cesta.y + 25
        );
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(cesta.x - 12, cesta.y + 13);
    ctx.lineTo(cesta.x + 12, cesta.y + 13);
    ctx.stroke();
}

// --------------------------------------------------
// DESENHO DOS JOGADORES
// --------------------------------------------------

function desenharJogador(jogador) {
    const balanço = Math.sin(jogador.fase);

    const alturaSalto = jogador.noChao
        ? 0
        : Math.sin(
            Math.min(
                1,
                Math.max(0, (CHAO - jogador.y - jogador.altura) / 85)
            ) * Math.PI
        ) * 5;

    ctx.save();

    // Inclinação mais forte do corpo.
    ctx.translate(
        jogador.x + jogador.largura / 2,
        jogador.y + jogador.altura / 2
    );

    ctx.rotate(jogador.inclinacao);

    ctx.translate(
        -jogador.largura / 2,
        -jogador.altura / 2
    );

    const sx = 0;
    const sy = -alturaSalto;

    // Sombra no chão
    ctx.restore();

    ctx.fillStyle = "#29292955";
    ctx.beginPath();
    ctx.ellipse(
        jogador.x + jogador.largura / 2,
        CHAO + 2,
        jogador.noChao ? 22 : 14,
        4,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.save();

    ctx.translate(
        jogador.x + jogador.largura / 2,
        jogador.y + jogador.altura / 2
    );

    ctx.rotate(jogador.inclinacao);

    ctx.translate(
        -jogador.largura / 2,
        -jogador.altura / 2
    );

    // Cabeça
    ctx.fillStyle = "#e8bd98";
    ctx.fillRect(8, sy, 19, 20);

    // Cabelo
    ctx.fillStyle = "#30231e";
    ctx.fillRect(6, sy - 2, 22, 6);

    // Olho
    ctx.fillStyle = "#111111";

    ctx.fillRect(
        jogador.direcaoBalanço > 0 ? 22 : 10,
        sy + 9,
        3,
        3
    );

    // Camisa
    ctx.fillStyle = jogador.cor;
    ctx.fillRect(4, sy + 21, 26, 27);

    // Número
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 10px Arial";
    ctx.fillText(jogador.numero, 10, sy + 38);

    // Braços balançando
    ctx.fillStyle = "#e8bd98";

    const braçoBalanço = balanço * 9;

    if (jogador.defesa > 0 && !jogador.noChao) {
        const direção = jogador === jogador1 ? 1 : -1;

        ctx.fillRect(
            direção > 0 ? 25 : -12,
            sy + 24 + braçoBalanço,
            19,
            6
        );
    } else {
        ctx.fillRect(
            -1,
            sy + 25 + braçoBalanço,
            6,
            20
        );

        ctx.fillRect(
            29,
            sy + 25 - braçoBalanço,
            6,
            20
        );
    }

    // Shorts
    ctx.fillStyle = "#242832";
    ctx.fillRect(4, sy + 48, 26, 10);

    // Pernas alternando o movimento
    ctx.fillStyle = "#e8bd98";

    ctx.fillRect(
        7 + balanço * 4,
        sy + 58,
        7,
        11
    );

    ctx.fillRect(
        20 - balanço * 4,
        sy + 58,
        7,
        11
    );

    // Tênis
    ctx.fillStyle = "#171717";

    ctx.fillRect(
        3 + balanço * 4,
        sy + 68,
        13,
        7
    );

    ctx.fillRect(
        18 - balanço * 4,
        sy + 68,
        15,
        7
    );

    ctx.restore();
}

// --------------------------------------------------
// DESENHO DA BOLA
// --------------------------------------------------

function desenharBola() {
    ctx.fillStyle = "#ff9d19";

    ctx.beginPath();
    ctx.arc(bola.x, bola.y, bola.raio, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#623919";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(
        bola.x - bola.raio,
        bola.y
    );

    ctx.lineTo(
        bola.x + bola.raio,
        bola.y
    );

    ctx.moveTo(
        bola.x,
        bola.y - bola.raio
    );

    ctx.lineTo(
        bola.x,
        bola.y + bola.raio
    );

    ctx.stroke();
}

// --------------------------------------------------
// PLACAR
// --------------------------------------------------

function desenharPlacar() {
    ctx.fillStyle = "#24252b";
    ctx.fillRect(275, 12, 350, 64);

    ctx.textAlign = "center";

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px monospace";
    ctx.fillText("BASKETROLL", W / 2, 36);

    ctx.font = "bold 24px monospace";

    ctx.fillStyle = jogador1.cor;
    ctx.fillText(pontos1, 390, 63);

    ctx.fillStyle = "#ffffff";
    ctx.fillText("-", 450, 63);

    ctx.fillStyle = jogador2.cor;
    ctx.fillText(pontos2, 510, 63);

    ctx.textAlign = "left";
}

function desenharMensagem() {
    if (tempoMensagem <= 0) return;

    ctx.fillStyle = "#24252be8";
    ctx.fillRect(270, 85, 360, 30);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";

    ctx.textAlign = "center";
    ctx.fillText(mensagem, W / 2, 104);
    ctx.textAlign = "left";

    tempoMensagem--;
}

// --------------------------------------------------
// LOOP PRINCIPAL
// --------------------------------------------------

function jogar() {
    quadro++;

    atualizarJogador(jogador1);
    atualizarJogador(jogador2);

    if (pausaCesta > 0) {
        pausaCesta--;
    } else {
        atualizarBola();
    }

    desenharQuadra();

    desenharCesta(cestaEsquerda, true);
    desenharCesta(cestaDireita, false);

    desenharJogador(jogador1);
    desenharJogador(jogador2);

    desenharBola();
    desenharPlacar();
    desenharMensagem();

    requestAnimationFrame(jogar);
}

jogar();
