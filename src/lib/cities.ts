export interface CityOption {
  nome: string;
  estado?: string;
  pais: 'BR' | 'UY';
}

const cidadesRSRaw = [
  'Alegrete', 'Alvorada', 'Bagé', 'Bento Gonçalves', 'Cachoeira do Sul',
  'Cachoeirinha', 'Camaquã', 'Campo Bom', 'Canela', 'Canoas',
  'Capão da Canoa', 'Carazinho', 'Carlos Barbosa', 'Caxias do Sul',
  'Cruz Alta', 'Dois Irmãos', 'Eldorado do Sul', 'Encantado', 'Erechim',
  'Esteio', 'Estância Velha', 'Estrela', 'Farroupilha', 'Flores da Cunha',
  'Frederico Westphalen', 'Garibaldi', 'Gramado', 'Gravataí', 'Guaíba',
  'Horizontina', 'Igrejinha', 'Ijuí', 'Ivoti', 'Lajeado',
  'Marau', 'Montenegro', 'Não-Me-Toque', 'Nova Hamburgo', 'Nova Petrópolis',
  'Nova Prata', 'Novo Hamburgo', 'Osório', 'Palmeira das Missões', 'Panambi',
  'Parobé', 'Passo Fundo', 'Pelotas', 'Porto Alegre', 'Rio Grande',
  'Rolante', 'Santa Cruz do Sul', 'Santa Maria', 'Santa Rosa', 'Santana do Livramento',
  'Santiago', 'Santo Ângelo', 'São Borja', 'São Gabriel', 'São Jerônimo',
  'São José do Norte', 'São Leopoldo', 'São Lourenço do Sul', 'São Marcos',
  'São Sebastião do Caí', 'Sapiranga', 'Sapucaia do Sul', 'Soledade',
  'Taquara', 'Taquari', 'Torres', 'Tramandaí', 'Três Coroas',
  'Três de Maio', 'Triunfo', 'Tupanciretã', 'Uruguaiana', 'Vacaria',
  'Venâncio Aires', 'Vera Cruz', 'Veranópolis', 'Viamão', 'Xangri-lá',
];

const cidadesUYRaw = [
  'Artigas', 'Bella Unión', 'Canelones', 'Carmelo', 'Chuy',
  'Colonia del Sacramento', 'Dolores', 'Durazno', 'Florida', 'Fray Bentos',
  'La Paz', 'Las Piedras', 'Maldonado', 'Melo', 'Mercedes',
  'Minas', 'Montevideo', 'Pando', 'Paysandú', 'Piriápolis',
  'Punta del Este', 'Rivera', 'Rocha', 'Salto', 'San Carlos',
  'San José de Mayo', 'Santa Lucía', 'Tacuarembó', 'Treinta y Tres', 'Trinidad',
];

export const cidades: CityOption[] = [
  ...cidadesRSRaw.map(nome => ({ nome, estado: 'RS', pais: 'BR' as const })),
  ...cidadesUYRaw.map(nome => ({ nome, pais: 'UY' as const })),
];

/** @deprecated Use `cidades` instead */
export const cidadesRS = cidadesRSRaw;
