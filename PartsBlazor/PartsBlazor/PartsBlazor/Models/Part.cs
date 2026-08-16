namespace PartsBlazor.Models;

public class Part
{
    public string Id { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; } = 0;
    public int Stock { get; set; } = 0;
    public bool Active { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
}

// A known part from the catalogue, used to autocomplete the SKU field
public record PartSuggestion(string Sku, string Name, string Category);

public enum PartCategory
{
    Fastener,
    Bearing,
    Seal,
    Gasket,
    Lubricant,
    Other
}
