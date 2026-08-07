namespace PartsBlazor.Services;

using System.Net.Http.Json;
using PartsBlazor.Models;

public class PartsService(HttpClient httpClient)
{
    // TODO define in environment variable
    private const string ApiUrl = "http://localhost:4000/parts";

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
}
