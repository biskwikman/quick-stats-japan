  //begin script when window loads
  window.onload = initialize();
  
  var keyArray = ["Total Population", "Total Foreign Population", "Total Violent Crime", "Total Police Officers", "Population Density (People per Square km) "]; //array of property keys
  var expressed = keyArray[0]; //initial attribute
  
  function initialize(){
    setMap();
  };
  
  //set choropleth map parameters
  function setMap(){
    
    //map frame dimensions
    var width = 960;
    var height = 700;
    
    //create a new svg element with the above dimensions
    var svg = d3.select("body")
                .append("svg")
                .attr("width", width)
                .attr("height", height);
    
    var map = svg.append("g").call(d3.zoom()
                    .scaleExtent([1/2, 4])
                    .on("zoom", zoomed));
    
    function zoomed() {
      map.attr("transform", d3.event.transform);
    }
    
    //create projection centered on Japan
    var projection = d3.geoMercator()
      .center([138.3, 39.2])
      .scale(1500)
      .translate([width / 2, height / 2 -100]);
    
    var path = d3.geoPath()
      .projection(projection);
    
    //use queue to parallelize asynchronous data
    d3.queue()
              .defer(d3.csv, "data/prefectureData1.csv") //load attributes from csv
              .defer(d3.json, "data/prefectures.json")//load geometry
              .await(callback); //trigger callback function once data is loaded
              
    function callback(error, csvData, japanData){
        
        var recolorMap = colorScale(csvData);
                      
        //variables for csv to json data transfer
        var jsonPrefectures = japanData.objects.prefectures.geometries;
        
        //loop through csv to assign each csv values to json prefecture
        for (var i=0; i<csvData.length; i++) {
          var csvPrefecture = csvData[i]; //the current prefecture
          var csvId = csvPrefecture.name; //name (name of prefecture)
          var number = 1;
          //loop through json prefectures to find the right prefecture
          for (var a=0; a<48; a++) {
            //where id match, attach csv to json object
            if (jsonPrefectures[a].properties.id == csvId) {
              //assign key/value pair
              
              for (var key in keyArray) {
                var attr = keyArray[key];
                var val = parseFloat(csvPrefecture[attr]);
                jsonPrefectures[a].properties[attr] = val;
              };
              
              //jsonPrefectures[a].properties.name = csvPrefecture.name;
              break;
              
            };
            
          };
         
        };
                      
        //add prefectures as enumeration units colored by data
        var prefectures = map.selectAll(".prefectures")
                              .data(topojson.feature(japanData, japanData.objects.prefectures).features)
                            .enter().append("path")
                              .attr("class", "prefectures")
                              .attr("id", function(d) { return d.properties.id })
                              .attr("d", path)
                              .style("fill", function(d) {
                                return choropleth(d, recolorMap);
                              })
                              .on("mouseover", highlight)
                              .on("mouseout", dehighlight)
                              .on("mousemove", moveLabel)
                              .append("desc") //append current color
                                .text(function(d) {
                                  return choropleth(d, recolorMap);
                                });
                              
        createDropdown(csvData);
                              
        console.log(jsonPrefectures);
    };
  };
  
  function createDropdown(csvData) {
    var dropdown = d3.select("body")
                      .append("div")
                      .attr("class", "dropdown")//for positioning menu with css
                      .html("<h3>Select Variable:</h3>")
                      .append("select")
                      .on("change", function() {
                        changeAttribute(this.value, csvData);
                      });
                      
    dropdown.selectAll("options")
            .data(keyArray)
            .enter()
            .append("option")
            .attr("value", function(d) { return d })
            .text(function(d) {
              d = d[0].toUpperCase() +
                      d.substring(1,3) +
                      d.substring(3);
              return d
            });
  };
  
  function colorScale(csvData) {
    
    //creates quantile classes with color scale
    var color = d3.scaleQuantile()
                  .range([
                          "#edf8fb",
                          "#b2e2e2",
                          "#66c2a4",
                          "#2ca25f",
                          "#006d2c"
                  ]);
                  
    //build array of all current expressed values for input domain
    var domainArray = [];
    for (var i in csvData) {
      domainArray.push(Number(csvData[i][expressed]));
    };
    
    //pass array of expressed values as domain
    color.domain(domainArray);
    
    return color; //return the color scale generator
  };
  
  function choropleth(d, recolorMap) {
    
    //get data value
    var value = d.properties[expressed];
    //if value exists, assign it a color; otherwise assign gray
    if (value) {
      return recolorMap(value);
    } else {
      return "#ccc";
    };
  };
  
  function changeAttribute(attribute, csvData) {
    //change the expressed attribute
    expressed = attribute;
    
    
    //recolor the map
    d3.selectAll(".prefectures")//select every region
      .style("fill", function(d) {
        return choropleth(d, colorScale(csvData));
      })
      .select("desc") //replace the color text in each desc element
        .text(function(d) {
          return choropleth(d, colorScale(csvData));
        });
  };
  
  function highlight(data) {
    
    var props = data.properties; //json properties
    
    d3.select("#"+props.id) //select current prefecture in DOM
      .style("fill", "#0f1238");
      
      var labelAttribute = "<h1>"+props[expressed]+
                              "</h1><br><b>"+expressed+"</b>"+"&nbsp";
      var labelName = props.id;
      
      //create label div
      var infolabel = d3.select("body").append("div")
                        .attr("class", "infolabel") //for styling label
                        .attr("id", props.id+"label") //for label div
                        .html(labelAttribute) //add text
                        .append("div") //add child div for feature name
                        .attr("class", "labelname") //for styling name
                        .html(labelName);
  };

  function dehighlight(data) {
    
    var props = data.properties;
    var prefecture = d3.select("#"+props.id);
    var fillcolor = prefecture.select("desc").text();
    prefecture.style("fill", fillcolor);
    
    d3.select("#"+props.id+"label").remove();
  };
  
  function moveLabel() {
    
    var x = d3.event.clientX+10
    var y = d3.event.clientY-75;
    d3.select("infolabel")
      .style("margin-left", x+"px")
      .style("margin-top", y+"px");
  };
