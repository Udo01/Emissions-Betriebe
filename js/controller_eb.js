//controller class
Controller = function() {
	// tables
	this.FT_ID_Betriebe = "1zS6OThUNSryAIF8ehyIF6_dy773RO9j4pN4JyXs";

	this.FT_apikey = "AIzaSyAZX14yLHGoDHYUuxfL9LV6wjhCP_afLV0";

	// select
	this.kennungbetrieb = null;
	this.betrieb = null;
	this.ort = null;

	//helper for sql-query
	this.sql_where_betriebe="";
	
	//actual position
	this.actPos=null;
	
	//list
	this.mapMode=-1;//0:list;1single item
	this.betriebeList=null;
	this.betriebeListX=null;

	// map
	this.centerPoint = null;
	this.map = null;
	// quelle
	this.geocoder;
}

Controller.prototype.init = function() {
	this.geocoder = new google.maps.Geocoder();
	//

//page events
$(document).on('pagecreate', '#betriebeSearchAdvancedPage', function(event, ui) {
	ctr.doBrancheList_BSAV();
});

$(document).on('pageshow', '#betriebeSearchPosPage', function(event, ui) {
	$.when(ctr.getPosition()).then(function(pos) {
		ctr.actPos=pos;
		$("#actPos_BSPP").val(pos);
		ctr.handleSearchBetriebe_BSPP();
	});
});

$(document).on('pageshow', '#betriebeSearchPLZPage', function(event, ui) {
	ctr.handleSearchBetriebe_BSPLZ();
});

$(document).on('pageshow', '#mapPage', function(event, ui) {
		ctr.drawMap();
		ctr.addBetriebeLayer();
		google.maps.event.trigger(ctr.map, 'resize');
		ctr.fitMapBounds();
});


//events
$("#dist_BSPP").on("input", function(e) {
	ctr.handleSearchBetriebe_BSPP();
});

$("#distPLZ_BSPLZ").on("input", function(e) {
	ctr.handleSearchBetriebe_BSPLZ();
});

$("#pLZ_BSPLZ").on("input", function(e) {
	ctr.handleSearchBetriebe_BSPLZ();
});

$("#distPosCB_BSAV").on("change", function(e) {
	$.when(ctr.getPosition()).then(function(pos) {
		ctr.actPos=pos;
		$("#actPosInp_BSAV").val(pos);
	});
});

$(document).on('tap', '#BetriebeSearchBtn_BSAV', function() {
	ctr.handleSearchBetriebe_BSAV();
});

$(document).on('tap', '.showMapBtn', function() {
	if(ctr.betriebeList!=null && ctr.betriebeList.length>0){
	ctr.mapMode=0;
	//$.mobile.changePage("#mapPage");
	$.mobile.changePage( "#mapPage");
	ctr.setMapSize();
	}
});


}

//betriebePage
//distinct Branche
Controller.prototype.doBrancheList_BSAV = function() {
	var query = "SELECT branchengruppe FROM "+ ctr.FT_ID_Betriebe; 
	query+=" GROUP BY branchengruppe";
	
	$.when(ctr.queryGet(query)).then(function(data) {
		if (data.rows != null) {
			ctr.fillBrancheSel_BSAV(data.rows);
		}
	});
}

//fill list of betriebe from betriebeListPage
Controller.prototype.fillBrancheSel_BSAV = function(rows) {
	var selectContainer = $("#brancheSel_BSAV");
	$(selectContainer).empty();

	if (rows != null) {
		$(selectContainer).append('<option value="-1">Branche</option>');
		for ( var i = 0; i < rows.length; i++) {
			$(selectContainer).append(
					'<option value="'+rows[i][0]+'">' + rows[i][0]
							+'</option>');
		}
		$(document).on('change', '#betriebBrancheSel_BSAV', function(event) {
			selectContainer.selectmenu("close");
			ctr.handleSearchBetriebe_BSAV();
		});
		selectContainer.selectmenu("refresh");
	}
}




//betriebeSearchPosPage 
Controller.prototype.handleSearchBetriebe_BSPP = function() {
	var actPos=null;
	var actDist=null;
	var listContainer=$("#betriebeLV_BSPP");
	if(ctr.actPos!=null){
		actPos=ctr.actPos;
		actDist=$("#dist_BSPP").val();
	}
	ctr.doSearchBetriebe("",-1,actPos,actDist,null,null,listContainer);
}

//betriebeSearchPLZPage 
Controller.prototype.handleSearchBetriebe_BSPLZ = function() {
	var address=$("#pLZ_BSPLZ").val()+",Germany";
	var listContainer=$("#betriebeLV_BSPLZ");
	$.when(ctr.getPosFromZip(address)).then(function(pos) {
		plzPos=pos;
		plzPosDist=$("#distPLZ_BSPLZ").val();
		ctr.doSearchBetriebe("",-1,null,null,plzPos,plzPosDist,listContainer);
	});
}

//betriebe advanced search
Controller.prototype.handleSearchBetriebe_BSAV = function() {
	var actPos=null;
	var actPosDist=null;
	var plzPos=null;
	var plzPosDist=null;
	var betriebName="";
	var branche=-1;
	var listContainer=$("#betriebeLV_BSAV");
	
	if($("#betrName_BSAV").val()!=null)betriebName=$("#betrName_BSAV").val();
	if($("#brancheSel_BSAV").val()!=null) branche=$("#brancheSel_BSAV").val();

	if($("#distPosCB_BSAV").prop("checked")){
		if(ctr.actPos!=null){
			actPos=ctr.actPos;
			actPosDist=$("#distPosInp_BSAV").val();
		}
	}
	
	if($("#distPLZCB_BSAV").prop("checked")){
		var address=$("#pLZInp_BSAV").val()+",Germany";
		$.when(ctr.getPosFromZip(address)).then(function(pos) {
			plzPos=pos;
			plzPosDist=$("#distPLZInp_BSAV").val();
			ctr.doSearchBetriebe(betriebName,branche,actPos,actPosDist,plzPos,plzPosDist,listContainer);
		});		
	}
	else{
		ctr.doSearchBetriebe(betriebName,branche,actPos,actPosDist,null,null,listContainer);
	}
}

Controller.prototype.doSearchBetriebe = function(name,branche,actPos,actPosDist,plzPos,plzPosDist,listContainer) {

	ctr.mapMode=0;
	var nameArr = name.split(" ", 2);
	var where="";
	var query = "SELECT kennung,name,anschrift,geometry FROM "
			+ ctr.FT_ID_Betriebe;
	
	query+=" WHERE";
	if(nameArr.length > 0){
		where= " name CONTAINS IGNORING CASE '" + nameArr[0] + "'";
		if (nameArr.length > 1)
			where += " AND name CONTAINS IGNORING CASE '" + nameArr[1] + "'";
	}
	if (branche!=-1){
		where += " AND branchengruppe = '" + branche + "'";
	}
	if(actPos!=null && actPosDist!=null){
		where += " AND ST_INTERSECTS(geometry, CIRCLE(LATLNG(" + actPos.lng() + ", "
		+ actPos.lat() + "), "+actPosDist*1000+"))";	
	}
	
	if(plzPos!=null && plzPosDist!=null){
		where += " AND ST_INTERSECTS(geometry, CIRCLE(LATLNG(" + plzPos.lng() + ", "
		+ plzPos.lat() + "), "+plzPosDist*1000+"))";	
	}
	ctr.sql_where_betriebe=where;
	query+=where;
	query += " LIMIT 100";

	$.when(ctr.queryGet(query)).then(function(data) {
		if(data.rows!=null){
			ctr.betriebeList = data.rows;
			ctr.fillBetriebeListName(data.rows,listContainer);
		}
		else listContainer.empty();
	});

}


//betriebeListPage
// fill list of betriebe from betriebeListPage
Controller.prototype.fillBetriebeListName = function(rows,listContainer) {
	listContainer.empty();

	for ( var i = 0; i < rows.length; i++) {
		listContainer.append(
				'<li><a href="#" id="betriebSelName_QN' + i + '"'
						+ 'data-kennung="' + rows[i][0] + '"'
						+ 'data-betrieb="' + rows[i][1] + '"'
						+ 'data-anschrift="' + rows[i][2] + '"' + 'data-ort="'
						+ rows[i][3] + '"' + 'data-strasse="' + rows[i][4]
						+ '"' + '>'
						+'<p>' + rows[i][1] + '</p>'
						+'<p>' + rows[i][2] + '</p>'
						+'</a>' + '</li>');

		$(document).on('tap', '#betriebSelName_QN' + i, function(event) {
			var kennung=$(this).attr('data-kennung');
			var where= "kennung='" + kennung + "'";
			
			ctr.sql_where_betriebeX=where;
			ctr.mapMode=1;
			
			$.mobile.changePage("#mapPage");
			ctr.setMapSize();
		});
	}
	listContainer.listview("refresh");
	listContainer.show();
}



//map
Controller.prototype.drawMap = function() {
	$("#mapCanvas").empty();
	var zoom=10;

	ctr.map = new google.maps.Map(document.getElementById('mapCanvas'), {
		panControl : true,
		zoomControl : true,
		zoomControlOptions : {
			style : google.maps.ZoomControlStyle.LARGE
		},
		scaleControl : true,
		zoom : zoom,
		mapTypeId : google.maps.MapTypeId.ROADMAP,
		cache:false
	});
}

//set map size
Controller.prototype.setMapSize = function() {
	$("#mapCanvas").css('height', $(window).height() * 1 + "px");
	$("#mapCanvas").css('width', $(window).width() * 0.98 + "px");
}

//fit map to bounds of layer
Controller.prototype.fitMapBounds = function() {
var bounds = new google.maps.LatLngBounds();
var list=null;
var geometryCol=null;

	list=ctr.betriebeList;
	geometryCol=3;
for(var i = 0; i < list.length; i++) {
	if(list[i][geometryCol].geometry!=null){  
	var point = new google.maps.LatLng(
        list[i][geometryCol].geometry.coordinates[1],
      		  list[i][geometryCol].geometry.coordinates[0]);
    bounds.extend(point);
}
}
// zoom to the bounds
ctr.map.fitBounds(bounds);
google.maps.event.addListenerOnce(ctr.map, 'bounds_changed', function(event) {
      if (this.getZoom()){
          this.setZoom(this.getZoom()-2);
      }
});
}


//Betriebe layer
Controller.prototype.addBetriebeLayer = function() {
	var where="";
	if(ctr.mapMode==0)where=ctr.sql_where_betriebe;
	if(ctr.mapMode==1)where=ctr.sql_where_betriebeX;
	
	var betriebeLayer = new google.maps.FusionTablesLayer({
		map : this.map,
		heatmap : {
			enabled : false
		},
		query : {
			select : "geometry",
			from : ctr.FT_ID_Betriebe,
			where : where
		},
		options : {
			styleId : 2,
			templateId : 2
		}
	});
}


//util functions

//get position
Controller.prototype.getPosition = function(rows) {
	var deferred = new $.Deferred();
	if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(function(position) {
		var pos = new google.maps.LatLng(position.coords.longitude,
				position.coords.latitude);
		deferred.resolve(pos);
	});
}
	return deferred.promise();
}

//get position from zip
Controller.prototype.getPosFromZip = function(zip) {
	var deferred = new $.Deferred();
	ctr.geocoder.geocode({
		'address' : zip
	},
	function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			if (results[0]) {
				var lat=results[0].geometry.location.e;
				var lng=results[0].geometry.location.d;
				var pos = new google.maps.LatLng(lat,lng);
				deferred.resolve(pos);
			}
		}
	}
);
	return deferred.promise();
}

// Send an SQL query to Fusion Tables with get
Controller.prototype.queryGet = function(query) {
	var encodedQuery = encodeURIComponent(query);
	// Construct the URL
	var url = [ 'https://www.googleapis.com/fusiontables/v1/query' ];
	url.push('?sql=' + encodedQuery);
	url.push('&key=' + this.FT_apikey);
	url.push('&callback=?');

	// Send the JSONP request using jQuery
	return $.ajax({
		url : url.join(''),
		dataType : 'jsonp',
		cache: false
	});
}

//Send an SQL query to Fusion Tables with post
Controller.prototype.queryPost = function(query) {
	var deferred = new $.Deferred();
	var path = '/fusiontables/v1/query';
	var body = 'sql=' + encodeURIComponent(query);
	
    gapi.client.request({ 
		path : path,
		body : body,
		headers : {
			'Content-Type' : 'application/x-www-form-urlencoded',
			'Content-Length' : body.length
		},
		method : 'POST'
    }).execute(function(results) {
        //alert("direct:"+JSON.stringify(results));
        deferred.resolve(results);
    });
    return deferred.promise();
}


