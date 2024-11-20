param(
    [Parameter(Mandatory=$false)]
    [string]$PackageName
)

Write-Host "Installing $PackageName"
./resources/python/python -m pip install --upgrade $PackageName --no-warn-script-location




