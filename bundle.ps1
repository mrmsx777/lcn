Write-Host "Bundling Solana Sentinel for Deployment..."
if (Test-Path "solana-sentinel-azure.zip") { Remove-Item "solana-sentinel-azure.zip" -Force }
Compress-Archive -Path "apps", "packages", ".env", "package.json", "pnpm-workspace.yaml", "tsconfig.base.json", "deploy-azure.sh" -DestinationPath "solana-sentinel-azure.zip" -Force
Write-Host "Bundling complete! You can now transfer solana-sentinel-azure.zip to your Azure VM."
