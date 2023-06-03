import {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { parse } from "https://deno.land/std@0.184.0/flags/mod.ts";
import { assert } from "https://deno.land/std@0.184.0/_util/asserts.ts";

const args = parse(Deno.args, { string: ["urls"] });

if (!args.urls) {
  throw new Error("--urls is required");
}

const csvData = await Deno.readTextFile(args.urls);
const urls = csvData.split("\n");

const ingredients = new Map<string, Map<string, number>>();

for (const url of urls) {
  const textResponse = await fetch(url);
  const textData = await textResponse.text();

  const document = new DOMParser().parseFromString(textData, "text/html");

  assert(document);

  [...document.querySelectorAll(".kptn-ingredient")].forEach((el) => {
    if (!(el instanceof Element)) {
      return;
    }

    const ingredient = el.textContent.trim();
    const row = el.parentElement?.parentElement;
    const amountElement = row?.querySelector(".kptn-ingredient-measure");
    const amountTuple = amountElement?.textContent.trim() ?? "1 count";
    const [rawAmount, rawMeasure] = amountTuple.split(" ");

    const amount = parseFloat(rawAmount);
    const measure = rawMeasure ?? 'count';

    const previousAmounts = ingredients.get(ingredient) ?? new Map();
    const previousAmount = previousAmounts?.get(measure) ?? 0;

    previousAmounts.set(measure, previousAmount + amount);
    ingredients.set(ingredient, previousAmounts);
  });
}

const results: string[] = [];

ingredients.forEach((amounts, ingredient) => {
  const entries: string[] = [];

  amounts.forEach((value, unit) => {
    entries.push(`${value} ${unit}`);
  });

  results.push([ingredient, ...entries].join('\t'));
});

console.log(results.join('\n'))
