/* =====================================================
   CABEÇALHO CENTRALIZADO E CONTIDO
===================================================== */

.topo {
  height: 80px;
  width: 100%;
  max-width: 960px; /* Limita a largura ao mesmo tamanho do resto do site */
  margin: 0 auto; /* Centraliza a barra na tela */
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.98);
  border-bottom: 1px solid var(--borda);
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(12px);
}

.logo {
  width: 145px;
  max-height: 58px;
  object-fit: contain;
}

.data-hora {
  color: var(--cinza);
  font-size: 12px;
  font-weight: 500;
  text-align: right;
}

/* =====================================================
   HERO / PERFIL CENTRALIZADO E CONTIDO
===================================================== */

.hero {
  max-width: 960px; /* Limita a largura máxima */
  margin: 0 auto 30px; /* Centraliza o bloco na página */
  padding: 40px 20px;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  align-items: center;
  gap: 30px;
  background: radial-gradient(circle at 85% 20%, #e6f0ff 0, transparent 40%), var(--branco);
  border: 1px solid var(--borda);
  border-radius: 22px; /* Adiciona cantos arredondados para combinar com os outros cards */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
}
