$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$baseUrl = "https://www.vivahnam.com"
$cachePath = Join-Path (Get-Location) "tmp\vivahnam-calculator-source.json"
$months = @(
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
)

function Get-SourceJson {
  param([Parameter(Mandatory = $true)][string]$Path)

  $lastError = $null
  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      $result = Invoke-RestMethod -Uri "$baseUrl$Path" -Headers @{ Accept = "application/json"; "User-Agent" = "Viraaya calculator audit" }
      if ($result -is [System.Array]) {
        foreach ($item in $result) { Write-Output $item }
        return
      }
      return $result
    } catch {
      $lastError = $_
      if ($attempt -eq 5) { break }
      Start-Sleep -Milliseconds (750 * $attempt)
    }
  }
  throw $lastError
}

New-Item -ItemType Directory -Force -Path (Split-Path $cachePath) | Out-Null

$citiesRaw = @(Get-SourceJson "/get-cities")
$cities = @()
$hotels = @()
$seenHotels = @{}
$prices = [ordered]@{}
$fetched = 0

foreach ($city in $citiesRaw) {
  $cityId = [int]$city.id
  $cityPosition = 0
  if ($null -ne $city.sort_order) { $cityPosition = [int]$city.sort_order }
  $cities += [ordered]@{
    id = $cityId
    countryId = $(if ($null -ne $city.country_id) { [int]$city.country_id } else { 0 })
    name = [string]$city.name
    published = $(if ($city.is_active) { 1 } else { 0 })
    position = $cityPosition
  }

  $cityHotels = @(Get-SourceJson "/get-hotels-by-city/$cityId")
  foreach ($hotel in $cityHotels) {
    $hotelId = [string]$hotel.id
    if (-not $seenHotels.ContainsKey($hotelId)) {
      $totalRooms = 0
      if ($null -ne $hotel.total_rooms) { $totalRooms = [int]$hotel.total_rooms }
      $seenHotels[$hotelId] = $true
      $hotels += [ordered]@{
        id = [int]$hotel.id
        cityId = $cityId
        name = [string]$hotel.name
        totalRooms = $totalRooms
      }
    }
  }
}

foreach ($hotel in $hotels) {
  $hotelId = [string]$hotel.id
  $prices[$hotelId] = [ordered]@{}
  foreach ($month in $months) {
    $prices[$hotelId][$month] = Get-SourceJson "/get-hotel-price/$hotelId/$month"
    $fetched += 1
    if (($fetched % 500) -eq 0) {
      Write-Host "[vivahnam] fetched $fetched monthly prices"
    }
  }
}

$currenciesRaw = @(Get-SourceJson "/api/currencies")
$currencies = @()
foreach ($currency in $currenciesRaw) {
  $currencies += [ordered]@{
    code = ([string]$currency.code).ToUpperInvariant()
    name = [string]$currency.name
    symbol = [string]$currency.symbol
    rateToUsd = [string]([double]$currency.rate_to_usd)
  }
}

$payload = [ordered]@{
  fetchedAt = (Get-Date).ToUniversalTime().ToString("o")
  source = $baseUrl
  cities = $cities
  hotels = $hotels
  prices = $prices
  currencies = $currencies
}

$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $cachePath -Encoding UTF8
Write-Host "[vivahnam] cached $($cities.Count) cities, $($hotels.Count) hotels, $fetched monthly prices"
