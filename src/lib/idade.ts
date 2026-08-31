// Idade e sempre calculada na hora, nunca gravada: um "menor de idade" salvo
// como booleano na inscricao envelhece errado -- o atleta faz 18 anos e o
// painel continua pedindo termo do responsavel.

/** Idade em anos completos na data de referencia. `null` se a data e invalida. */
export const calcularIdade = (
  dataNascimento: string,
  referencia = new Date(),
): number | null => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataNascimento.trim());
  if (!partes) {
    return null;
  }
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);

  // Comparacao por componentes locais: new Date("2009-05-10") e interpretado
  // como UTC e erra a idade por um dia perto do aniversario.
  let idade = referencia.getFullYear() - ano;
  const mesRef = referencia.getMonth() + 1;
  const diaRef = referencia.getDate();
  if (mesRef < mes || (mesRef === mes && diaRef < dia)) {
    idade -= 1;
  }
  return idade;
};

/** Data invalida cai como maior de idade: sem data confiavel nao ha aviso. */
export const ehMenorDeIdade = (
  dataNascimento: string,
  referencia?: Date,
): boolean => {
  const idade = calcularIdade(dataNascimento, referencia);
  return idade !== null && idade < 18;
};
