import { Buffer } from 'buffer';
import { getSoapUrl } from './db';

type SoapVariant = {
  namespace: 'urn:AC' | 'urn:MaNGOS' | 'urn:TC';
  prefixedMethod: boolean;
  soapAction: string;
};

const SOAP_VARIANTS: SoapVariant[] = [
  { namespace: 'urn:AC', prefixedMethod: true, soapAction: 'executeCommand' },
  { namespace: 'urn:MaNGOS', prefixedMethod: true, soapAction: 'executeCommand' },
  { namespace: 'urn:TC', prefixedMethod: true, soapAction: 'executeCommand' },
  { namespace: 'urn:AC', prefixedMethod: false, soapAction: 'urn:AC#executeCommand' },
  { namespace: 'urn:MaNGOS', prefixedMethod: false, soapAction: 'urn:MaNGOS#executeCommand' },
];

function buildSoapEnvelope(command: string, variant: SoapVariant): string {
  const method = variant.prefixedMethod ? 'ns1:executeCommand' : 'executeCommand';
  return `<?xml version="1.0" encoding="utf-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="${variant.namespace}">
  <SOAP-ENV:Body>
    <${method}>
      <command>${command}</command>
    </${method}>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

function shouldTryNextVariant(status: number, text: string): boolean {
  if (status === 401 || status === 403) return false;
  return /method name or namespace not recognized|not implemented|namespace/i.test(text);
}

/**
 * Ejecuta un comando en el servidor AzerothCore vía SOAP.
 */
export async function executeSoapCommand(command: string) {
  const soapEndpoint = await getSoapUrl();
  const soapUser = process.env.ACORE_SOAP_USER;
  const soapPassword = process.env.ACORE_SOAP_PASSWORD;

  // Si no está configurado SOAP, lo ignoramos para no romper el flujo.
  if (!soapEndpoint || !soapUser || !soapPassword) {
    return { skipped: true };
  }

  const authUsers = Array.from(new Set([soapUser, soapUser.toUpperCase()]));
  const failures: string[] = [];
  let authDeniedReason = '';
  
  try {
    for (const authUser of authUsers) {
      const auth = Buffer.from(`${authUser}:${soapPassword}`).toString('base64');
      for (const variant of SOAP_VARIANTS) {
        const xml = buildSoapEnvelope(command, variant);
        const response = await fetch(soapEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction: variant.soapAction,
          },
          body: xml,
          cache: 'no-store',
        });

        const text = await response.text();
        const hasFault = /faultcode|SOAP-ENV:Fault|<result>false<\/result>/i.test(text);
        const faultMsg = text.match(/<faultstring>([\s\S]*?)<\/faultstring>/i)?.[1]?.trim();

        if (response.ok && !hasFault) {
          return { skipped: false, response: text };
        }

        const reason = faultMsg || `HTTP ${response.status}`;
        failures.push(`${authUser}/${variant.namespace}/${variant.prefixedMethod ? 'prefixed' : 'plain'} (${variant.soapAction}): ${reason}`);

        if (response.status === 401 || response.status === 403) {
          authDeniedReason = reason;
          break;
        }
        if (!shouldTryNextVariant(response.status, text)) {
          break;
        }
      }
    }

    if (authDeniedReason) {
      throw new Error(`SOAP auth denied (401/403). ${failures.join(' | ')}`);
    }

    throw new Error(`SOAP command failed after ${failures.length} intento(s). ${failures.join(' | ')}`);
  } catch (error: unknown) {
    throw error;
  }
}
