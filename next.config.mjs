const nextConfig = {
  output: 'standalone',
  // O Next 16 bloqueia requisições de dev vindas de outra origem, e o
  // checkout do Mercado Pago exige HTTPS — ou seja, testar de verdade
  // significa acessar o dev por um túnel. Sem liberar essa origem, o HTML
  // renderiza mas os chunks do cliente são recusados: a página aparece
  // inteira e nada é clicável.
  allowedDevOrigins: ['*.trycloudflare.com', '*.ngrok-free.app', '*.loca.lt'],
};

export default nextConfig;
