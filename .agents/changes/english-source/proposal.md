# english-source

Tracker: none
Kind: change (refactor of an existing behaviour; not a bug)

## Ask (verbatim)

Make English the source language of Atril's UI. Today every t()/useT() key is the Spanish text and src/preload/i18n-en.ts maps it to English. Flip it: every key in the code becomes its English text, and a new Spanish catalog (src/preload/i18n-es.ts) maps English → Spanish, so a Mac in Spanish (or «Español» in Ajustes → Idioma) still shows exactly today's Spanish, and English shows today's English. Do it with a script, not by hand, keep {placeholders} intact, keep the S16/S19 i18n scans and every existing test passing (tests that assert Spanish text should keep running in Spanish), and add a test that fails if a key in code is missing from the Spanish catalog. Out: translating specs, docs or test names.
