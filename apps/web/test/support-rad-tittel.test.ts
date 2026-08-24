import { describe, expect, it } from 'vitest';
import {
  authorLabel,
  supportRadTittel,
  supportRolleEtikett,
  supportTradTittel,
} from '../app/(app)/innboks/_lib.ts';

describe('supportRadTittel — listerad', () => {
  it('viser KUN forhandler-/verkstednavn, ikke person+forhandler', () => {
    expect(supportRadTittel('Kari', 'Yamaha Bergen')).toBe('Yamaha Bergen');
    expect(supportRadTittel('Skiftenøkkelen', 'Yamaha Bergen')).toBe('Yamaha Bergen');
    expect(supportRadTittel(null, 'Yamaha Bergen')).toBe('Yamaha Bergen');
    expect(supportRadTittel('Kari', null)).toBe('Endwise-samtale');
    expect(supportRadTittel('  ', '')).toBe('Endwise-samtale');
    expect(supportRadTittel(undefined, undefined)).toBe('Endwise-samtale');
  });
});

describe('supportTradTittel — chat/trådhode', () => {
  it('viser personen du snakker med, aldri Ansatt som navn', () => {
    expect(supportTradTittel('Kari')).toBe('Kari');
    expect(supportTradTittel('Skiftenøkkelen')).toBe('Skiftenøkkelen');
    expect(supportTradTittel('Ansatt')).toBe('Endwise-samtale');
    expect(supportTradTittel('  ')).toBe('Endwise-samtale');
    expect(supportTradTittel(null)).toBe('Endwise-samtale');
  });

  it('setter visningsnavn PLUSS ekte rolle i chatboksen, aldri Ansatt', () => {
    expect(supportTradTittel('Kari', 'dealer_admin')).toBe('Kari · Forhandler-admin');
    expect(supportTradTittel('Mikael', 'endwise_admin')).toBe('Mikael · Endwise-admin');
    expect(supportTradTittel('Liv', 'endwise_support')).toBe('Liv · Endwise-support');
    expect(supportTradTittel('Kari', 'ansatt')).toBe('Kari');
    expect(supportTradTittel('Kari', 'dealer_staff')).toBe('Kari');
    expect(supportTradTittel('Ansatt', 'dealer_admin')).toBe('Forhandler-admin');
  });
});

describe('supportRolleEtikett', () => {
  it('viser Forhandler-admin / Endwise-admin / Endwise-support — aldri Ansatt', () => {
    expect(supportRolleEtikett('dealer_admin')).toBe('Forhandler-admin');
    expect(supportRolleEtikett('endwise_admin')).toBe('Endwise-admin');
    expect(supportRolleEtikett('endwise_support')).toBe('Endwise-support');
    expect(supportRolleEtikett('ansatt')).toBeNull();
    expect(supportRolleEtikett('dealer_staff')).toBeNull();
    expect(supportRolleEtikett(null)).toBeNull();
  });
});

describe('authorLabel', () => {
  it('bruker visningsnavn, aldri den generiske Ansatt-etiketten som navn', () => {
    expect(authorLabel('u1', 'meg', { u1: { navn: 'Mikael', rolle: 'dealer_admin' } })).toBe(
      'Mikael',
    );
    expect(authorLabel('u1', 'u1', { u1: { navn: 'Mikael', rolle: 'dealer_admin' } })).toBe('Deg');
    expect(authorLabel('u1234567', 'meg', { u1234567: { navn: 'Ansatt', rolle: 'ansatt' } })).toBe(
      'Deltaker u12345',
    );
  });
});
