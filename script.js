document.addEventListener('DOMContentLoaded', init);

async function init() {
  let sceneIndex = 0;
  const raw = await d3.csv(
    'data/nchs-age-adjusted-death-rates-for-selected-major-causes-of-death.csv',
    d3.autoType
  );
  const data = raw.filter(d => d['Age Adjusted Death Rate'] < 2000);

  const M = { top: 60, right: 20, bottom: 60, left: 70 };
  const W = 800 - M.left - M.right;
  const H = 400 - M.top  - M.bottom;

  const svg = d3.select('#viz')
    .append('svg')
      .attr('width',  W + M.left + M.right)
      .attr('height', H + M.top  + M.bottom)
    .append('g')
      .attr('transform', `translate(${M.left},${M.top})`);

  const x = d3.scaleLinear().range([0, W]).domain(d3.extent(data, d => d.Year));
  const y = d3.scaleLinear().range([H, 0]).domain([0, d3.max(data, d => d['Age Adjusted Death Rate']) * 1.05]);
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  d3.select('#backBtn').on('click', () => {
    sceneIndex = Math.max(0, sceneIndex - 1);
    updateChartForScene();
  });
  d3.select('#nextBtn').on('click', () => {
    sceneIndex = Math.min(2, sceneIndex + 1);
    updateChartForScene();
  });

  updateChartForScene();

  function updateChartForScene() {
    svg.selectAll('*').remove();
    d3.select('#backBtn').style('display', sceneIndex > 0 ? 'inline-block' : 'none');
    d3.select('#nextBtn').style('display', sceneIndex < 2 ? 'inline-block' : 'none');

    if (sceneIndex === 0) {
    scene1();
    } else if (sceneIndex === 1) {
    scene2();
    } else {
    scene3();
    }
  }

  function scene1() {
    const causes = ['Heart Disease','Cancer'];
    color.domain(causes);

    const series = causes.map(c =>
      data.filter(d => d.Cause === c).sort((a,b) => a.Year - b.Year)
    );

    drawTitle('Heart Disease vs. Cancer (1900–2017)');
    drawAxes();

    const lineGen = d3.line()
      .x(d => x(d.Year))
      .y(d => y(d['Age Adjusted Death Rate']));

    series.forEach((s,i) => {
      svg.append('path')
        .datum(s)
        .attr('fill','none')
        .attr('stroke', color(causes[i]))
        .attr('stroke-width',2)
        .attr('d', lineGen);
    });

    const hd = series[0];
    const pk = hd.find(d => d.Year === 1960);
    const px = x(pk.Year), py = y(pk['Age Adjusted Death Rate']);

    svg.append('line')
      .attr('x1', px).attr('y1', py)
      .attr('x2', px - 30).attr('y2', py - 40)
      .attr('stroke','black').attr('stroke-width',1);

    svg.append('circle')
      .attr('cx', px).attr('cy', py).attr('r', 2)
      .attr('fill','none').attr('stroke','black');

    svg.append('text')
      .attr('x', px - 30 - 5).attr('y', py - 40 - 5)
      .attr('text-anchor','end')
      .attr('font-size','10px')
      .attr('fill','black')
      .text('Heart Disease peaks (1960)');

    const legend = svg.append('g')
      .attr('transform', `translate(${W - 120},20)`);
    causes.forEach((c,i) => {
      const row = legend.append('g').attr('transform', `translate(0,${i*20})`);
      row.append('rect')
        .attr('width',12).attr('height',12)
        .attr('fill', color(c));
      row.append('text')
        .attr('x',16).attr('y',10)
        .attr('font-size','12px')
        .attr('fill','black')
        .text(c);
    });
  }

  function scene2() {
    const year = 2017;
    const top5 = data.filter(d => d.Year === year)
      .sort((a,b) => b['Age Adjusted Death Rate'] - a['Age Adjusted Death Rate'])
      .slice(0,5);

    drawTitle(`Top 5 Causes of Death in ${year}`);
    const xB = d3.scaleBand().domain(top5.map(d=>d.Cause)).range([0,W]).padding(0.3);
    const y5 = d3.scaleLinear().domain([0, d3.max(top5,d=>d['Age Adjusted Death Rate'])*1.1]).range([H,0]);
    drawAxes(xB, y5, 'Cause', 'Death Rate (per 100,000)');

    svg.selectAll('rect').data(top5).join('rect')
      .attr('x', d=>xB(d.Cause))
      .attr('y', d=>y5(d['Age Adjusted Death Rate']))
      .attr('width', xB.bandwidth())
      .attr('height', d=>H - y5(d['Age Adjusted Death Rate']))
      .attr('fill', d=>color(d.Cause));
  }

  function scene3() {
    drawTitle('All Causes Over Time (Hover for details)');
    drawAxes();

    const lineGen = d3.line()
      .x(d=>x(d.Year))
      .y(d=>y(d['Age Adjusted Death Rate']));

    const allCauses = Array.from(new Set(data.map(d=>d.Cause)));
    allCauses.forEach(cause => {
      const series = data.filter(d=>d.Cause===cause).sort((a,b)=>a.Year-b.Year);

      svg.append('path')
        .datum(series)
        .attr('fill','none')
        .attr('stroke', color(cause))
        .attr('stroke-width',1.2)
        .attr('d', lineGen);

      svg.selectAll(`.pt-${cause.replace(/\s+/g,'')}`)
        .data(series).join('circle')
        .attr('class',`pt-${cause.replace(/\s+/g,'')}`)
        .attr('cx',d=>x(d.Year))
        .attr('cy',d=>y(d['Age Adjusted Death Rate']))
        .attr('r',3)
        .attr('fill','transparent')
        .on('mouseover',(e,d)=>{
          d3.select('body').append('div')
            .attr('class','tooltip')
            .style('left',`${e.pageX+5}px`)
            .style('top',`${e.pageY-30}px`)
            .html(`<strong>${cause}</strong><br>Year: ${d.Year}<br>Rate: ${d['Age Adjusted Death Rate']}`);
        })
        .on('mouseout',()=>d3.selectAll('.tooltip').remove());
    });
  }

  function drawAxes(xScale = x, yScale = y, xLabel = 'Year', yLabel = 'Death Rate (per 100,000)') {
    svg.append('g').call(d3.axisLeft(yScale));
    const bottom = d3.axisBottom(xScale).tickFormat(xScale.bandwidth ? null : d3.format('d'));
    svg.append('g').attr('transform', `translate(0,${H})`).call(bottom);
    svg.append('text')
       .attr('class','axis-label')
       .attr('x', W/2).attr('y', H + M.bottom - 10)
       .text(xLabel);
    svg.append('text')
       .attr('class','axis-label')
       .attr('transform','rotate(-90)')
       .attr('x', -H/2).attr('y', -M.left + 20)
       .text(yLabel);
  }

  function drawTitle(txt) {
    svg.append('text')
       .attr('class','chart-title')
       .attr('x', W/2).attr('y', -M.top/2)
       .text(txt);
  }
}
