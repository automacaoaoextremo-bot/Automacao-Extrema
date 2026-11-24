import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function loadTs(relative) {
  const source = readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 }, reportDiagnostics: true });
  assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
  const exports = {};
  vm.runInNewContext(result.outputText, { exports });
  return exports;
}
const { reminderTargets } = loadTs('../src/lib/presenca-reminder-targets.ts');
const { buildDaniela50ReminderMessage, buildPublicConfirmationUrl, getPresencaPublicEventExtras, formatDaniela50Deadline, daniela50CampaignLabel } = loadTs('../src/lib/presenca-daniela50.ts');
const guest = (id, status, extra = {}) => ({ id, full_name: id, guest_status: status, individual_token: `token-${id}`, whatsapp: '5519999990000', primary_guest_id: null, is_invite_recipient: true, is_active: true, ...extra });
const guests = [guest('Principal', 'confirmado'), guest('Vinculado', 'pendente', { primary_guest_id: 'Principal', is_invite_recipient: false, whatsapp: null }), guest('Talvez', 'talvez'), guest('Confirmado', 'confirmado_com_acompanhantes'), guest('Recusou', 'nao_podera_ir'), guest('Inativo', 'pendente', { is_active: false }), guest('SemTelefone', 'pendente', { whatsapp: null }), guest('Reserva', 'reservou_data'), guest('Remover', 'remover')];
const event = { slug: 'daniela-50-anos', host_name: 'Daniela' };
const url = buildPublicConfirmationUrl({ baseUrl: 'https://example.invalid/', event, token: 'TESTE' });

test('final RSVP: one invite per group, linked pending, maybe, reserved, no declined/inactive', () => {
  const { targets, skippedNoRecipient } = reminderTargets(guests, 'final-rsvp');
  assert.equal(targets.length, 3);
  assert.equal(skippedNoRecipient, 1);
  const root = targets.find(t => t.recipient.id === 'Principal');
  assert.equal(root.audience, 'pendente');
  assert.equal(root.pendingNames.join(','), 'Vinculado');
  assert.equal(root.confirmedNames.join(','), 'Principal');
  assert.ok(targets.some(t => t.audience === 'talvez'));
  assert.ok(targets.some(t => t.recipient.id === 'Reserva'));
  assert.ok(!targets.some(t => t.recipient.id === 'Recusou'));
});
test('confirmed week/eve: includes confirmed companions status, no declined-only group', () => {
  for (const campaign of ['confirmed-week', 'confirmed-eve']) {
    const { targets } = reminderTargets(guests, campaign);
    assert.equal(targets.length, 2);
    assert.ok(targets.some(t => t.recipient.id === 'Confirmado'));
    assert.ok(targets.every(t => t.audience === 'confirmado'));
  }
});
test('declined recipient can receive information for a confirmed linked guest', () => {
  const { targets } = reminderTargets([guest('Principal', 'nao_podera_ir'), guest('Vinculado', 'confirmado', { primary_guest_id: 'Principal', whatsapp: null })], 'confirmed-eve');
  assert.equal(targets.length, 1);
  assert.equal(targets[0].confirmedNames.join(','), 'Vinculado');
});
test('individual link, paragraphs, campaign labels and copy: no promise of unimplemented photo album', () => {
  const base = { guest: guests[0], event, confirmationUrl: url, audience: 'pendente', campaign: 'final-rsvp', mixed: true, pendingNames: ['Vinculado'] };
  const text = buildDaniela50ReminderMessage(base);
  assert.match(text, /Vinculado/);
  assert.match(text, /demais respostas já registradas continuam valendo/);
  assert.match(text, /Se não puder comparecer/);
  assert.ok(text.includes('\n\n' + url + '\n\n'));
  assert.ok(!url.includes('#'));
  assert.ok(!text.includes('álbum'));
  assert.ok(!text.includes('19/11'));
  assert.ok(buildDaniela50ReminderMessage({ ...base, campaign: 'confirmed-eve' }).includes('É amanhã!'));
  assert.ok(buildDaniela50ReminderMessage({ ...base, campaign: 'confirmed-week', photosReady: true }).includes('álbum de memórias'));
  assert.notEqual(daniela50CampaignLabel('confirmed-week'), daniela50CampaignLabel('confirmed-eve'));
  assert.equal(formatDaniela50Deadline(), '01/12/2026');
});
test('Sky photo restored even when database attractions already exist; other events untouched', () => {
  const extras = getPresencaPublicEventExtras({ ...event, attractions: [{ title: 'Outra atração', description: 'Mantida' }, { title: 'Sky Bartenders', description: 'Descrição atual' }] });
  const sky = extras.attractions.find(a => a.title === 'Sky Bartenders');
  assert.equal(sky.description, 'Descrição atual');
  assert.match(sky.imageUrl, /sky-bartenders\.png$/);
  assert.ok(extras.attractions.some(a => a.title === 'Outra atração'));
  assert.equal(getPresencaPublicEventExtras({ slug: 'outro' }).attractions.length, 0);
});
