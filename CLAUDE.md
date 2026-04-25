Description -> domain: CONSERVATION TECH
Habitat fragmentation is one of the biggest drivers of biodiversity loss in Europe. Roads and urban sprawl cut ecosystems into isolated patches that animals can't move between. The science for fixing this exists, for example wildlife corridors, culvert retrofits, hedgerow planting. However the bottleneck is that it is hard to figure out where to actually intervene and it takes a landscape ecologist months of GIS work, and the output is a PDF that's outdated within a year.

We want to build a tool that automates the whole workflow. You point it at a region and a set of species, (e.g. badgers and otters) in Gelderland. It pulls land cover maps, road networks, species occurrence data, road-kill records, and cadastral ownership. It models how hard it is for each species to move through the landscape, runs connectivity analysis to find where movement is being strangled, and gives a ranked list of concrete fixes: which culvert to retrofit, which hedgerow to plant, which landowner to contact.

It also generates everything needed to act on it, personalised landowner letters, pre-filled subsidy applications, a summary for whoever holds the budget. And it re-runs monthly, so the analysis stays current.

All the underlying data is open, GBIF, OpenStreetMap, Sentinel-2, Dutch government registers. The connectivity modelling software is open source. What doesn't exist is something that ties it all together and produces outputs non-specialists can actually use.

How it works
Step 1
It assembles the landscape. The agent pulls, for a user-specified region:
OpenStreetMap (roads, buildings, land-use polygons, waterways, fences where tagged)
Copernicus land cover and Sentinel-2 imagery (ground truth for actual vegetation)
National datasets (for NL: BRT/BGT, provincial ecological network "NNN" layers, Atlas Natuurlijk Kapitaal)
GBIF, iNaturalist (alternative of GBIF since GBIF is planning a partial outage between 23-28 april), Waarneming.nl for species occurrences
Road-kill databases (in NL: waarneming.nl has a dedicated "verkeerslachtoffers" section; UK has Project Splatter; plus provincial datasets)
Existing ecoduct and wildlife tunnel inventories (Rijkswaterstaat publishes these)
It stitches these into a single georeferenced stack — the kind of data preparation that eats the first two weeks of any real project.
Step 2
It builds a resistance surface per target species. A resistance surface is a map where each pixel has a number representing how hard it is for a given species to cross it.

Forest = low resistance for a dormouse, high for a grass snake.
A highway = near-infinite resistance for almost everything.
A hedgerow = low resistance for small mammals, moderate for deer.

This is where species expertise normally becomes the bottleneck. The agent uses published resistance values from the peer-reviewed literature (there's a surprisingly rich body of this — Zeller et al., Koen et al., plus species-specific papers) and lets you pick target species from a menu: badger, otter, red deer, European pine marten, great crested newt, hazel dormouse, etc. It generates a resistance surface per species and documents every coefficient choice with a citation, so a reviewing ecologist can audit and adjust.
Step 3
It runs the connectivity analysis. Claude Code orchestrates Circuitscape (or the faster Omniscape for large regions) with the resistance surface plus "source" and "destination" habitat patches (identified automatically from land cover + minimum patch size thresholds per species). Output: a current-density map showing where animals would move if they could — the "pinch points" where corridors are most valuable per euro spent.
Step 4
It identifies interventions. This is where it stops being an academic exercise. The agent overlays pinch points onto OSM and land use to classify each bottleneck:
Road crossing → needs an ecoduct (€2M-€8M), wildlife underpass (€200k-€800k), or small-mammal culvert (€15k-€60k) depending on target species
Bare agricultural field → hedgerow planting (~€8-15/meter) or wildflower strip
Fenced boundary → wildlife-permeable fence modification or removal
Missing stepping-stone → small woodland block, pond, or rough grassland creation
Each intervention gets a cost estimate, a benefit score (how much connectivity it unlocks, quantified by rerunning the circuit model with it in place), and a cost-effectiveness ranking.
Step 5
It handles the paperwork. This is the part that makes it actually deployable rather than another dashboard. The agent produces:
GeoPackage / Shapefile outputs for the province's GIS team
A written technical report with methods, assumptions, and cited resistance values
Landowner outreach letters — personalized per parcel using the cadastre (Kadaster in NL, Land Registry in UK), explaining what's being proposed on their land, what it costs them (usually nothing — it's on marginal field edges), and what subsidies apply (ANLb agrarisch natuurbeheer, GLB eco-schemes, provincial biodiversity grants)
Pre-filled subsidy applications
A stakeholder map showing which municipalities, water boards, and NGOs need to sign off
Step 6
And here's the agentic twist — it updates itself as the landscape changes. Rerun it quarterly. New road-kill cluster appeared? New housing development approved? Farmer converted a pasture? The agent reprioritizes, flags what changed, and drafts amendments to the plan. The corridor design becomes a living document tracking a living landscape, not a PDF that ages out the week after it's published
Pitch ideas
150 species go extinct every single day.
Every life that can't advocate for itself needs someone who can.
The builders in this room have something most of the world doesn't — access to tools powerful enough to solve problems that have been stuck for decades. We tend to aim those tools at each other. At people with laptops and credit cards and GitHub accounts.
But there are other stakeholders in the future we're building. They don't file feature requests. They don't show up in TAM calculations. And they are dying, quietly, in the gaps between infrastructure we built without thinking about them.

Where does a unit of effort produce the most impact? Most AI products are built for people who already have twelve alternatives. Non-human species have zero. (effectove altruism) And the technology isn't the bottleneck — it never was. The bottleneck is someone deciding this problem is worth 24 hours of their attention. (effective accelerationism)

In this world there are billions of lives with no access to AI, no access to the people who build it, no voice in what gets built next. Many of them aren't human. They don't get a seat at the table.
We have the seat. We have the 24 hours. We have the tools.
Build local means building for the places and lives that don't make it onto a product roadmap. A badger doesn't have a roadmap. A river otter doesn't have a Jira ticket. But they have a habitat being cut in half by a road, and we can figure out exactly where to put the underpass.



PoC (only design/structure of the app)



ITN framework analysis
Importance
Habitat fragmentation is the #1 driver of terrestrial biodiversity loss in Europe, ahead of direct habitat destruction
EU Nature Restoration Law (2024) legally mandates restoring 20% of EU land/sea by 2030 => connectivity is core to compliance
Fragmented populations collapse even when "enough" habitat exists (inbreeding, no climate migration, local extinctions)
Road mortality alone kills ~194M birds and ~29M mammals/year in Europe
Unlocks co-benefits: flood resilience, pollination, carbon storage, climate adaptation corridors
Tractability
The science is solved: circuit theory (Circuitscape/Omniscape) is mature, peer-reviewed, open-source
All required data is already open: OSM, Copernicus, GBIF, Kadaster, road-kill databases
Interventions are concrete and buildable: hedgerows, culverts, ecoducts, fence gaps, no new tech needed
Claude Code compresses the actual bottleneck (human glue work between tools + paperwork) from months to hours
Demo-able in a weekend on a single province with a single species
Neglectedness
Maybe a few hundred people in Europe can do end-to-end corridor analysis and thousands of landscapes need it
Small NGOs, provinces, and water boards cannot afford €50-150k ecological consultancy studies
Big AI-for-climate money flows to energy/carbon; biodiversity gets a sliver despite equal urgency
No existing tool bridges GIS analysis -> cost estimation -> landowner letters -> subsidy applications
Conservation tech is dominated by monitoring (cameras, acoustics); action planning is wide open
Target audiences -> NGOs + Government
Main possible clients:
Dutch / Benelux
Natuurmonumenten — largest Dutch nature NGO, manages 370+ reserves, actively doing connectivity work
De Vlinderstichting — butterfly conservation, huge on habitat networks and corridors
Zoogdiervereniging — Dutch mammal society, owns the road-kill data and badger/otter connectivity expertise
ARK Rewilding Nederland — explicitly focused on landscape-scale connectivity and rewilding corridors
Landschappen NL — umbrella for 12 provincial landscape trusts, each managing regional networks
Vogelbescherming Nederland — BirdLife partner, works on agricultural landscape connectivity
Natuur & Milieu — policy-focused, plugged into EU Nature Restoration Law implementation
European
Rewilding Europe — flagship org, runs 10+ large rewilding landscapes needing connectivity planning
European Wildlife — pan-European corridor advocacy
EuroNatur — focused on Green Belt (former Iron Curtain corridor) and Balkan connectivity
WWF European Policy Office — Nature Restoration Law implementation lead
BirdLife Europe — policy + 40+ national partners
IUCN European Regional Office — sets the standards your outputs would align to
Wetlands International — wetland-specific connectivity (otters, amphibians, waterbirds)
Jury
Adriaan Mol https://www.linkedin.com/in/adriaan/
Founder of Mollie (payments app)
No studies
Clare Jones https://www.linkedin.com/in/clare-jones-/
Climate tech, co-founder at a travel tech company
Studied geography
investor
Duco van Lanschot https://www.linkedin.com/in/lanschot/
B2B fintech
Studied law
investor
Ruben Timmerman https://www.linkedin.com/in/rubentimmerman/
Sustainable systems change, climate, circular economy, and conscious leadership.
Someone who believes the world changes through redesigning systems rather than fixing symptoms. Low-tech solutions (sand batteries, night trains, shared tools)
Studied information science
Investor



https://www.prorail.nl/
https://www.samenvoorbiodiversiteit.nl/toolbox/ecologisch-verbinden
https://www.sierraclub.org/sierra/wildlife-crossings-can-mend-landscape
https://portals.iucn.org/library/sites/library/files/documents/PAG-030-En.pdf
https://circuitscape.org/
https://www.zja.nl/en/Ecoduct-Kootwijk
https://www.iene.info/
https://conservationcorridor.org/the-science-of-corridors/




Features

Userflow
Landing page
Dramatic hero section presenting our mission
Scroll to find the NGOs that are currently doing this (+ add a payment link to donate for this cause) + showcase the current process (introduce the scope, present the project really well -> maybe create a FAQ)
In the hero section, a button “see the data”
Main website -> showcase of the idea
An extremely detailed map that presents animal movement per species occurences
Heatmaps -> where are the most roadkills
What habitat is in danger of being fragmented
Visualization of the existing crossings / ecoducts
See critical points
Select a region and generate the entire workflow needed to build a crossing -> what municipalities to contact, what documents are required (checklist), what landowners to contact


