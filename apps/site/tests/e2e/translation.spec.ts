import { expect, test } from "@playwright/test";

test("une version traduite montre son texte en tableau, une ligne par colonne", async ({
  page,
}) => {
  await page.goto("/hong-lou-meng/cheng-ren-bu-zi-zai-zi-zai-bu-cheng-ren");

  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveText(["Chinois simplifié", "Français"]);

  const rows = table.getByRole("row").filter({ has: page.getByRole("cell") });
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByRole("cell")).toHaveText(
    ["成人不自在", "Qui souhaite devenir vraiment un homme ne songe pas à se donner de l'aise ;"],
    { useInnerText: true },
  );
  await expect(rows.nth(1).getByRole("cell")).toHaveText(
    ["自在不成人", "qui ne songe qu'à se donner de l'aise ne deviendra jamais vraiment un homme."],
    { useInnerText: true },
  );
  await expect(rows.nth(0).getByRole("cell").first()).toHaveAttribute("lang", "zh-Hans");
});

test("une version sans traduction montre la liste de ses lignes en simplifié, sans tableau", async ({
  page,
}) => {
  await page.goto("/pieces/mo-xing-ji");

  await expect(page.getByRole("table")).toHaveCount(0);
  // La première est celle de la version courante ; l'antérieure suit.
  const text = page.getByTestId("version-text").first();
  await expect(text.getByRole("listitem")).toHaveText(["莫性急平流缓进", "墨行机兔起鹘落"], {
    useInnerText: true,
  });
  await expect(text).toHaveAttribute("lang", "zh-Hans");
});
