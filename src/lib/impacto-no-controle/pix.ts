function field(id: string, value: string) {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function sanitize(value: string, max: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-\.\/]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}


function normalizePixKey(key: string) {
  const trimmed = key.trim();

  if (trimmed.includes("@")) return trimmed.toLowerCase();

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    return digits ? `+${digits}` : trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");

  // CPF/CNPJ are registered in Pix without punctuation in the BR Code payload.
  if (digitsOnly.length === 11 || digitsOnly.length === 14) return digitsOnly;

  return trimmed;
}

export function buildPixPayload(params: {
  key: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid?: string;
  description?: string;
}) {
  const gui = field("00", "br.gov.bcb.pix");
  const key = field("01", normalizePixKey(params.key));
  const desc = params.description ? field("02", sanitize(params.description, 40)) : "";
  const merchantAccount = field("26", gui + key + desc);
  const txid = field("05", sanitize(params.txid || "IMPACTO", 25));
  const additional = field("62", txid);

  const payload =
    field("00", "01") +
    field("01", "12") +
    merchantAccount +
    field("52", "0000") +
    field("53", "986") +
    field("54", params.amount.toFixed(2)) +
    field("58", "BR") +
    field("59", sanitize(params.merchantName || "IMPACTO CONTROLE", 25)) +
    field("60", sanitize(params.merchantCity || "CAMPINAS", 15)) +
    additional;

  const withCrcPlaceholder = payload + "6304";
  return withCrcPlaceholder + crc16(withCrcPlaceholder);
}
