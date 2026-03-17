using Sts2StateExport;

List<string> failures = [];

Run("Combat action catalog includes targeted variants and terminal action", failures, () =>
{
    List<ExportCombatCard> cards =
    [
        new ExportCombatCard { Id = "strike-a", Title = "Strike", CostText = "1", IsPlayable = true },
        new ExportCombatCard { Id = "bash-a", Title = "Bash", CostText = "2", IsPlayable = true, ValidTargetIds = ["enemy-1", "enemy-2"] },
        new ExportCombatCard { Id = "curse-a", Title = "Curse", CostText = "?", IsPlayable = false }
    ];

    List<string> actions = CombatMenuCatalog.BuildActions(cards, ["combat.use_potion:potion-0"], ["combat.open_pile:draw"]);
    ExpectSequence(actions,
    [
        "combat.use_potion:potion-0",
        "combat.play:strike-a",
        "combat.play:bash-a",
        "combat.play:bash-a@enemy-1",
        "combat.play:bash-a@enemy-2",
        "combat.open_pile:draw",
        "combat.end_turn"
    ]);
});

Run("Combat intent summary prefers title+description then falls back", failures, () =>
{
    ExpectEqual(CombatIntentSummaryBuilder.Build("Attack", "Deal 10", "10", "Intent"), "Attack: Deal 10");
    ExpectEqual(CombatIntentSummaryBuilder.Build(null, "Deal 10", "10", "Intent"), "Deal 10");
    ExpectEqual(CombatIntentSummaryBuilder.Build(null, null, "10", "Intent"), "10");
    ExpectEqual(CombatIntentSummaryBuilder.Build(null, null, null, "Intent"), "Intent");
});

Run("Merchant cost text detector filters numeric and gold labels", failures, () =>
{
    ExpectTrue(MerchantInventoryText.LooksLikeCostText("123"));
    ExpectTrue(MerchantInventoryText.LooksLikeCostText("123 gold"));
    ExpectTrue(MerchantInventoryText.LooksLikeCostText("Cost: 123"));
    ExpectFalse(MerchantInventoryText.LooksLikeCostText("Deal 10 damage"));
});

Run("Merchant description builder appends affordability and stock state", failures, () =>
{
    ExpectEqual(
        MerchantEntryDescriptionBuilder.Compose("Gain strength.", 150, isStocked: true, affordable: false, extra: "On sale."),
        "Gain strength. Cost: 150 gold. Not enough gold. On sale.");
    ExpectEqual(
        MerchantEntryDescriptionBuilder.Compose(null, 75, isStocked: false, affordable: true, extra: null),
        "Cost: 75 gold. Sold out.");
});

if (failures.Count > 0)
{
    Console.Error.WriteLine("Sts2StateExport.Tests failed:");
    foreach (string failure in failures)
    {
        Console.Error.WriteLine($"- {failure}");
    }

    Environment.Exit(1);
}

Console.WriteLine($"Sts2StateExport.Tests passed ({4 - failures.Count}/4).");

static void Run(string name, List<string> failures, Action test)
{
    try
    {
        test();
    }
    catch (Exception exception)
    {
        failures.Add($"{name}: {exception.Message}");
    }
}

static void ExpectEqual<T>(T actual, T expected)
{
    if (!EqualityComparer<T>.Default.Equals(actual, expected))
    {
        throw new InvalidOperationException($"Expected '{expected}', got '{actual}'.");
    }
}

static void ExpectTrue(bool value)
{
    if (!value)
    {
        throw new InvalidOperationException("Expected condition to be true.");
    }
}

static void ExpectFalse(bool value)
{
    if (value)
    {
        throw new InvalidOperationException("Expected condition to be false.");
    }
}

static void ExpectSequence(IReadOnlyList<string> actual, IReadOnlyList<string> expected)
{
    if (!actual.SequenceEqual(expected))
    {
        throw new InvalidOperationException($"Expected [{string.Join(", ", expected)}], got [{string.Join(", ", actual)}].");
    }
}
