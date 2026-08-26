export const limparCpf = (cpf: string) => cpf.replace(/\D/g, "");

export const validarCpf = (cpf: string): boolean => {
  const digits = limparCpf(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }
  const calcDigit = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) {
      sum += Number(digits[i]) * (slice + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return (
    calcDigit(9) === Number(digits[9]) && calcDigit(10) === Number(digits[10])
  );
};
