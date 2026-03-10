export default interface Caso {
  caso: string;
  resumen: string | null;
  fecha: string | null;
  filename: string;
  articulos: number[];
  pais: string | null;
  numero_serie: number | null;
  tipo_documento: string;
  tipo_sentencia: string[];
  casos_relacionados?: string[];
  excerpt?: string;
}
