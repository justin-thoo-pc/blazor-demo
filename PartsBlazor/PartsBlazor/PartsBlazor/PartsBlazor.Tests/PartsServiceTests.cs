using Xunit;
using FluentAssertions;
using PartsBlazor.Services;
using PartsBlazor.Models;
using Moq;

namespace PartsBlazor.Tests;

public class PartsServiceTests
{
    [Fact]
    public void GetCategories_ReturnsValidCategories()
    {
        // Arrange
        var httpClientMock = new Mock<HttpClient>();
        var service = new PartsService(httpClientMock.Object);

        // Act
        var categories = service.GetCategories();

        // Assert
        categories.Should().NotBeEmpty();
        categories.Should().Contain("Fastener");
        categories.Should().Contain("Bearing");
    }
}