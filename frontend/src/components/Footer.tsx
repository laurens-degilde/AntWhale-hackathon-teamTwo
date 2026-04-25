export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <strong>Corridor</strong>
          <p>Open-source connectivity planning for the European landscape.</p>
        </div>
        <div>
          <span className="footer-h">Data</span>
          <ul>
            <li><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors</li>
            <li><a href="https://land.copernicus.eu/" target="_blank" rel="noreferrer">Copernicus Land Monitoring Service</a></li>
            <li><a href="https://dataspace.copernicus.eu/" target="_blank" rel="noreferrer">Copernicus Data Space (Sentinel-2)</a></li>
            <li><a href="https://www.gbif.org/" target="_blank" rel="noreferrer">GBIF</a> &amp; <a href="https://www.inaturalist.org/" target="_blank" rel="noreferrer">iNaturalist</a></li>
            <li><a href="https://www.pdok.nl/" target="_blank" rel="noreferrer">PDOK</a> · <a href="https://www.rijkswaterstaat.nl/" target="_blank" rel="noreferrer">Rijkswaterstaat</a></li>
          </ul>
        </div>
        <div>
          <span className="footer-h">Methods</span>
          <ul>
            <li><a href="https://circuitscape.org/" target="_blank" rel="noreferrer">Circuitscape</a></li>
            <li>Resistance coefficients: Zeller et al., Koen et al., species-specific literature</li>
            <li><a href="https://conservationcorridor.org/the-science-of-corridors/" target="_blank" rel="noreferrer">Conservation Corridor</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Corridor — built for the AntWhale hackathon.</span>
      </div>
    </footer>
  )
}
