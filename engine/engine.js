// ===============================
// FONCTION PRINCIPALE : AUDITER
// ===============================
function auditer() {

    // 1. Récupération des données
    const montantProjet = parseFloat(document.getElementById("montantProjet").value);

    if (!montantProjet || montantProjet <= 0) {
        alert("Le champ 'Montant projet' est obligatoire pour l'analyse IA.");
        return;
    }

    const hypo1 = parseFloat(document.getElementById("hypo1").value) || 0;
    const nantissement = parseFloat(document.getElementById("nantissement").value) || 0;
    const caution = parseFloat(document.getElementById("caution").value) || 0;

    const ltv = parseFloat(document.getElementById("ltv").value) || 0;
    const lta = parseFloat(document.getElementById("lta").value) || 0;
    const ltc = parseFloat(document.getElementById("ltc").value) || 0;
    const marge = parseFloat(document.getElementById("marge").value) || 0;

    const typeProjet = document.getElementById("typeProjet").value;


    // ===============================
    // 2. Pondération des garanties
    // ===============================
    let pondHypo = 1.0;
    let pondNant = 0.6;
    let pondCaution = 0.4;

    if (caution >= montantProjet) {
        pondCaution = 0.6;
    }

    let couvertureCaution = (caution / montantProjet) * 100;

    let couverturePonderee =
        (hypo1 * pondHypo) +
        (nantissement * pondNant) +
        (couvertureCaution * pondCaution);


    // ===============================
    // 3. Calcul du LTV net
    // ===============================
    let ltvNet = ltv * (1 - (couverturePonderee / 100));

    if (couverturePonderee >= 150) {
        ltvNet = 0;
    }


    // ===============================
    // 4. Détermination du risque IA
    // ===============================
    let risqueIA = "MODÉRÉ";

    if (couverturePonderee >= 120) {
        risqueIA = "SAFE";
    } else if (couverturePonderee < 60 || ltv > 80 || marge < 10) {
        risqueIA = "RISQUÉ";
    }

    let ltaImpact = lta;
    if (couverturePonderee >= 100) {
        ltaImpact = 0;
    }


    // ===============================
    // 5. Ticket IA
    // ===============================
    let ticketMin = 50;
    let ticketMax = 500;

    if (couverturePonderee >= 120 && couverturePonderee < 150) {
        ticketMin = 10;
        ticketMax = 1000;
    }
    else if (couverturePonderee >= 150 && couverturePonderee < 200) {
        ticketMin = 10;
        ticketMax = 2000;
    }
    else if (couverturePonderee >= 200) {
        ticketMin = 10;
        ticketMax = 3000;
    }


    // ===============================
    // 6. AFFICHAGE DES RÉSULTATS
    // ===============================
    document.getElementById("couverturePonderee").textContent = couverturePonderee.toFixed(1) + " %";
    document.getElementById("ltvNet").textContent = ltvNet.toFixed(1) + " %";
    document.getElementById("risqueIA").textContent = risqueIA;
    document.getElementById("ticketMin").textContent = ticketMin + " €";
    document.getElementById("ticketMax").textContent = ticketMax + " €";

    // Ligne surgarantie
    document.getElementById("surgarantie").textContent =
        couverturePonderee >= 120 ? "Oui (SAFE)" : "Non";

    // LTA impacté
    document.getElementById("ltaImpact").textContent = ltaImpact;
}



// ===============================
// AUTRES FONCTIONS
// ===============================

function sauvegarder() {
    alert("Fonction Sauvegarder OK");
}

function ouvrirGuide() {
    alert("Ouverture du guide…");
}

function exportCSV() {
    alert("Export CSV OK");
}

function toggleTheme() {
    document.body.classList.toggle("dark");
}
