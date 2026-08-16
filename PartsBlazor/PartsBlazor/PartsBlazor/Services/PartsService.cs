namespace PartsBlazor.Services;

using System.Net.Http.Json;
using PartsBlazor.Models;

public class PartsService(HttpClient httpClient)
{
    private const string ApiUrl = "parts";

    // Fetch paginated parts
    public async Task<(List<Part> Items, int Total)> GetPartsAsync(
        int page = 1, 
        int limit = 10, 
        string? sortBy = null, 
        string? filter = null,
        string? categoryFilter = null,
        CancellationToken ct = default)
    {
        var url = $"{ApiUrl}?_page={page}&_limit={limit}";
        if (!string.IsNullOrEmpty(sortBy))
            url += $"&_sort={sortBy}";
        if (!string.IsNullOrEmpty(filter))
            url += $"&q={filter}";
        if (!string.IsNullOrEmpty(categoryFilter))
            url += $"&category={categoryFilter}";

        var response = await httpClient.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();

        var parts = await response.Content.ReadFromJsonAsync<List<Part>>(cancellationToken: ct) 
            ?? new();
        
        // json-server returns total count in X-Total-Count header
        var total = int.TryParse(
            response.Headers.FirstOrDefault(h => h.Key == "X-Total-Count").Value?.FirstOrDefault(), 
            out var t) ? t : parts.Count;

        return (parts, total);
    }

    // Create a new part
    public async Task<Part?> CreatePartAsync(Part part, CancellationToken ct = default)
    {
        var response = await httpClient.PostAsJsonAsync(ApiUrl, part, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Part>(cancellationToken: ct);
    }

    // Update an existing part
    public async Task<Part?> UpdatePartAsync(string id, Part part, CancellationToken ct = default)
    {
        var response = await httpClient.PutAsJsonAsync($"{ApiUrl}/{id}", part, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Part>(cancellationToken: ct);
    }

    // Delete a part
    public async Task DeletePartAsync(string id, CancellationToken ct = default)
    {
        var response = await httpClient.DeleteAsync($"{ApiUrl}/{id}", ct);
        response.EnsureSuccessStatusCode();
    }

    // Get categories (hardcoded for demo)
    public List<string> GetCategories() =>
        Enum.GetNames(typeof(PartCategory)).ToList();

    // Known part catalogue used for SKU autocomplete (hardcoded for demo)
    private static readonly List<PartSuggestion> Catalog =
    [
        new("BLT-001", "Hex Head Bolt M10x50", "Fastener"),
        new("NUT-002", "Nylon Lock Nut M10", "Fastener"),
        new("WHB-003", "Front Wheel Hub Bearing", "Bearing"),
        new("PLB-004", "Pilot Bearing 15mm", "Bearing"),
        new("CRS-005", "Crankshaft Front Oil Seal", "Seal"),
        new("AXS-006", "Rear Axle Shaft Seal", "Seal"),
        new("HGK-007", "Cylinder Head Gasket", "Gasket"),
        new("EMG-008", "Exhaust Manifold Gasket", "Gasket"),
        new("GRS-009", "Lithium Complex Wheel Bearing Grease", "Lubricant"),
        new("ATF-010", "Automatic Transmission Fluid Dexron VI", "Lubricant")
    ];

    // Match the search term against SKU or name, SKU prefix matches first
    public List<PartSuggestion> SearchCatalog(string? term, int limit = 8)
    {
        if (string.IsNullOrWhiteSpace(term))
            return [];

        term = term.Trim();

        return Catalog
            .Where(p => p.Sku.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                        p.Name.Contains(term, StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(p => p.Sku.StartsWith(term, StringComparison.OrdinalIgnoreCase))
            .ThenBy(p => p.Sku, StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .ToList();
    }
}
