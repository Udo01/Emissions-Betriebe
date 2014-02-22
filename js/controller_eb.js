//controller class
Controller = function() {
	// tables
	this.FT_ID_Betriebe = "1zS6OThUNSryAIF8ehyIF6_dy773RO9j4pN4JyXs";
	this.FT_ID_Quellen="15NHDW6cnXc6lCf2Y8DTnhGJWDT0w-0o8Mg1ocGc";
	this.FT_apikey = "AIzaSyAZX14yLHGoDHYUuxfL9LV6wjhCP_afLV0";
	
	//login
	this.loggedIn=false
	
	//page edit
	this.editQSP=false;
	
	//photos
	this.PicasaUser_ID="118338015824269465026";
	this.PicasaAlbum_ID="5976541535623797537";
	this.Google_authKey="Gv1sRgCKHzz7KTj9SPZg";
	this.picasaAlbums=[{
		userID:"118338015824269465026",
		albumID:"5976541535623797537",
		authKey:"Gv1sRgCKHzz7KTj9SPZg",
		title:null,
		author:null,
		webUrl:null,
		photoList:null
	    }];
	
	// select
	this.kennungbetrieb = null;
	this.rowid_Q=-1;
	this.betrieb = null;
	this.ort = null;
	
	//pagefrom
	this.pageFrom=null;
	
	//helper for sql-query
	this.sql_where_betriebe="";
	this.sql_where_quellen="";
	
	//actual position
	this.actPos=null;
	
	//list
	this.betriebeList=null;
	this.quellenList=null;

	// map
	this.centerPoint = null;
	this.map_B = null;
	this.map_Q = null;
	// quelle
	this.geocoder;
}

Controller.prototype.init = function() {
	//init geocoder
	this.geocoder = new google.maps.Geocoder();
	//get photolist
	ctr.initPicasaAlbums();

//page events
$(document).on('pagecreate', '#betriebeSearchAdvancedPage', function(event, ui) {
	ctr.doBrancheList_BSAV();
});
$(document).on('pageshow', '#betriebeSearchPosPage', function(event, ui) {
	ctr.show_BSPP();
});
$(document).on('pageshow', '#betriebeSearchPLZPage', function(event, ui) {
	ctr.handleSearchBetriebe_BSPLZ();
});
$(document).on('pageshow', '#quellenSearchPage', function(event, ui) {
	ctr.showSearchQuellen_QSP();
});
$(document).on('pageshow', '#quelleDetailPage', function(event, ui) {
	ctr.editQSP=false;
});
$(document).on('pagebeforehide', '#quelleDetailPage', function(event, ui) {
	if(ctr.loggedIn && ctr.editQSP)ctr.updateQuelle();
});
$(document).on('pageshow', '#mapPage_B', function(event, ui) {
	ctr.showMapPage_B();
});
$(document).on('pageshow', '#mapPage_Q', function(event, ui) {
	ctr.showMapPage_Q();
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
	ctr.distPosCB_Change_BSAV();
});
$(document).on('tap', '#BetriebeSearchBtn_BSAV', function() {
	ctr.handleSearchBetriebe_BSAV();
});
$(document).on('change', '#betriebBrancheSel_BSAV', function(event) {
	$("#brancheSel_BSAV").selectmenu("close");
	ctr.handleSearchBetriebe_BSAV();
});
$(document).on('tap', '#betriebSelBtn_BSP', function(event) {
	var kennung=$(this).attr('data-kennung');
	var where= "kennung='" + kennung + "'";
	ctr.sql_where_betriebe_Single=where;
	ctr.mapMode=1;
	$.mobile.changePage("#mapPage_B");
	ctr.setMapSize("mapCanvas_B");
});
$(document).on('tap', '.showMapBtn_B', function() {
	ctr.showMapBtn_B_Tap();
});
$(document).on('tap', '.showMapBtn_Q', function() {
	ctr.showMapBtn_Q_Tap();
});


$(document).on('tap', '.quelleSelBtn_QSP', function(event) {
	var rowid=$(this).attr('data-rowid');
	ctr.rowid_Q=rowid;
	ctr.showDetails_QDP();
});
$("#nameIP_QSP").on("input", function(e) {
	ctr.showSearchQuellen_QSP();
});
$("#quelleDetailPage input").on("input", function(e) {
	ctr.editQSP=true;
});


$(document).on('tap', '#exitBtn', function() {
	ctr.exitBtn_Tap();
});

}
//end init


//Global
Controller.prototype.exitBtn_Tap = function(){
	 if (navigator.app) {
         navigator.app.exitApp();
     }
     else if (navigator.device) {
         navigator.device.exitApp();
     }	
}

//Betriebe
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
	query+=where+" ORDER BY 'name'";
	query += " LIMIT 500";

	$.when(ctr.ft_queryGet(query)).then(function(data) {
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
				'<li><a href="#" id="betriebSelBtn_BSP"'
						+ 'data-kennung="' + rows[i][0] + '"'
						+ 'data-betrieb="' + rows[i][1] + '"'
						+ 'data-anschrift="' + rows[i][2] + '"' + 'data-ort="'
						+ rows[i][3] + '"' + 'data-strasse="' + rows[i][4]
						+ '"' + '>'
						+'<p>' + rows[i][1] + '</p>'
						+'<p>' + rows[i][2] + '</p>'
						+'</a>' + '</li>');
	}
	listContainer.listview("refresh");
	listContainer.show();
}

//Betriebe layer
Controller.prototype.addBetriebeLayer = function() {
	var where="";
	where=ctr.sql_where_betriebe;
	
	var betriebeLayer = new google.maps.FusionTablesLayer({
		map : ctr.map_B,
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

//distinct Branche
Controller.prototype.doBrancheList_BSAV = function() {
	var query = "SELECT branchengruppe FROM "+ ctr.FT_ID_Betriebe; 
	query+=" GROUP BY branchengruppe";
	
	$.when(ctr.ft_queryGet(query)).then(function(data) {
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
		selectContainer.selectmenu("refresh");
	}
}

Controller.prototype.distPosCB_Change_BSAV = function(rows) {
	ctr.getPosition().done(function (pos) {
		if(pos!=null) {
			ctr.actPos=pos;
			$("#actPosInp_BSAV").val(pos);
			}
			else
				{
				alert("Position nicht verfügbar!");
				}   
	}).fail(function () {
		alert("Position nicht verfügbar!");
	});
}


//betriebeSearchPosPage 
Controller.prototype.show_BSPP = function() {
	ctr.getPosition().done(function (pos) {
		if(pos!=null) {
			ctr.actPos=pos;
			$("#actPos_BSPP").val(pos);
			ctr.handleSearchBetriebe_BSPP();
			}
			else
				{
				alert("Position nicht verfügbar!");
				}   
	}).fail(function () {
		alert("Position nicht verfügbar!");
	});	
}

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

//show map Betriebe
Controller.prototype.showMapBtn_B_Tap = function() {
	if(ctr.betriebeList!=null && ctr.betriebeList.length>0){
		ctr.pageFrom=$.mobile.activePage.attr('id');
		$.mobile.changePage( "#mapPage_B");
		ctr.setMapSize("mapCanvas_B");
		}	
}

Controller.prototype.showMapPage_B = function() {
	ctr.drawMap_B("mapCanvas_B");
	ctr.addBetriebeLayer();
	google.maps.event.trigger(ctr.map_B, 'resize');
	ctr.fitMapBounds(ctr.map_B,ctr.betriebeList,3);	
}

Controller.prototype.drawMap_B = function(container) {
	$("#"+container).empty();
	var zoom=10;

	ctr.map_B = new google.maps.Map(document.getElementById(container), {
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

//Quellen
Controller.prototype.showSearchQuellen_QSP = function() {
	var name=$("#nameIP_QSP").val();
	var listContainer=$("#quelleLV_QSP");
	ctr.doSearchQuellen(name,null,null,listContainer);
}

Controller.prototype.doSearchQuellen = function(name,actPos,actPosDist,listContainer) {
	var nameArr = name.split(" ", 2);
	var where="";
	var query = "SELECT rowid,betrieb,anlage,teilanlage,quelle,anschrift,geometry FROM "
			+ ctr.FT_ID_Quellen;
	
	query+=" WHERE";
	if(nameArr.length > 0){
		where= " betrieb CONTAINS IGNORING CASE '" + nameArr[0] + "'";
		if (nameArr.length > 1)
			where += " AND betrieb CONTAINS IGNORING CASE '" + nameArr[1] + "'";
	}
	
	if(actPos!=null && actPosDist!=null){
		where += " AND ST_INTERSECTS(geometry, CIRCLE(LATLNG(" + actPos.lng() + ", "
		+ actPos.lat() + "), "+actPosDist*1000+"))";	
	}
	
	ctr.sql_where_quellen=where;
	query+=where+" ORDER BY 'betrieb'";
	query += " LIMIT 200";

	$.when(ctr.ft_queryGet(query)).then(function(data) {
		if(data.rows!=null){
			ctr.quellenList = data.rows;
			ctr.fillQuellenListName(data.rows,listContainer);
		}
		else listContainer.empty();
	});
}

Controller.prototype.getQuelle = function(rowid) {
	var deferred = new $.Deferred();
	var query = "SELECT rowid,kennungbetrieb,betrieb,anschrift,anlage,teilanlage,quelle,quellenbeschreibung,ansprechpartner,geometry,hoehe,lage,material,form,durchmesser,zugang,strom,messstutzen,temperatur,abgasgeschwindigkeit,dyndruck,statdruck,volumenstrom,komponenten,bemerkung FROM "
	+ ctr.FT_ID_Quellen
	+" WHERE rowid='" + rowid + "'";

	$.when(ctr.ft_queryGet(query)).then(function(data) {
		if(data.rows!=null && data.rows.length>0){
			deferred.resolve(data.rows[0]);
		}
	});
	return deferred.promise();
}

//fill list of quelle from quelleneListPage
Controller.prototype.fillQuellenListName = function(rows,listContainer) {
	listContainer.empty();

	for ( var i = 0; i < rows.length; i++) {
		listContainer.append(
				'<li><a href="#" class="quelleSelBtn_QSP"'
						+ 'data-rowid="' + rows[i][0] + '"'
						+ 'data-betrieb="' + rows[i][1] + '"'
						+ 'data-anlage="' + rows[i][2] + '"'
						+ 'data-quelle="' + rows[i][4] + '"' + '>'
						+'<p>' + rows[i][1] + '</p>'
						+'<p>' + rows[i][2] + '</p>'
						+'<p>' + rows[i][4] + '</p>'
						+'</a>' + '</li>');
	}
	listContainer.listview("refresh");
	listContainer.show();
}

Controller.prototype.showDetails_QDP = function() {
	$.when(ctr.getQuelle(ctr.rowid_Q)).then(function(quelle) {
		var lat=quelle[9].geometry.coordinates[0];
		var lng=quelle[9].geometry.coordinates[1];
		var photoList=ctr.getGooglePhotosFromPos(new google.maps.LatLng(lat,lng),1);
		$("#photoContainer_QDP").html("");
		
		$.each(photoList, function (index, photo) {
			var title=photo.title.$t;
			var description=photo.media$group.media$description.$t;
			var thumbnailUrl=photo.media$group.media$thumbnail[0].url;
			var photoUrl=photo.media$group.media$content[0].url;
		
			$("#photoContainer_QDP").append(
					'<a href="'+photoUrl+'" class="swipebox" title="'+title+'">'
					+'<img src="'+thumbnailUrl+'" alt="image">'
					+'</a>'
			);
		
		});
		
		$.mobile.changePage("#quelleDetailPage");
		$("#rowid_QDP").val(quelle[0]);
		$("#kennungbetrieb_QDP").val(quelle[1]);
		$("#betrieb_QDP").val(quelle[2]);
		$("#anschrift_QDP").val(quelle[3]);
		$("#anlage_QDP").val(quelle[4]);
		$("#teilanlage_QDP").val(quelle[5]);
		$("#quelle_QDP").val(quelle[6]);
		$("#quellenbeschreibung_QDP").val(quelle[7]);
		$("#ansprechpartner_QDP").val(quelle[8]);
		$("#geometry_QDP").val(quelle[9].geometry.coordinates);
		$("#hoehe_QDP").val(quelle[10]);
		$("#lage_QDP").val(quelle[11]);
		$("#material_QDP").val(quelle[12]);
		$("#form_QDP").val(quelle[13]);
		$("#durchmesser_QDP").val(quelle[14]);
		$("#zugang_QDP").val(quelle[15]);
		$("#strom_QDP").val(quelle[16]);
		$("#messstutzen_QDP").val(quelle[17]);
		$("#temperatur_QDP").val(quelle[18]);
		$("#abgasgeschwindigkeit_QDP").val(quelle[19]);
		$("#dyndruck_QDP").val(quelle[20]);
		$("#statdruck_QDP").val(quelle[21]);
		$("#volumenstrom_QDP").val(quelle[22]);
		$("#komponenten_QDP").val(quelle[23]);
		$("#bemerkung_QDP").val(quelle[24]);
		
		$(".swipebox").swipebox();
	});
}

//show map Quellen
Controller.prototype.showMapBtn_Q_Tap = function() {
	if(ctr.quellenList!=null && ctr.quellenList.length>0){
		ctr.pageFrom=$.mobile.activePage.attr('id');
		$.mobile.changePage("#mapPage_Q");
		ctr.setMapSize("mapCanvas_Q");
		}	
}

Controller.prototype.showMapPage_Q = function() {
	ctr.drawMap_Q("mapCanvas_Q");
	ctr.addQuellenLayer();
	google.maps.event.trigger(ctr.map_Q, 'resize');
	ctr.fitMapBounds(ctr.map_Q,ctr.quellenList,6);	
}

//Quellen layer
Controller.prototype.addQuellenLayer = function() {
	var quellenLayer = new google.maps.FusionTablesLayer({
		map : ctr.map_Q,
		heatmap : {
			enabled : false
		},
		query : {
			select : "geometry",
			from : ctr.FT_ID_Quellen,
			where : ctr.sql_where_quellen
		},
		options : {
			styleId : 2,
			templateId : 2
		},
		suppressInfoWindows: true
	});

	google.maps.event.addListener(quellenLayer, 'click', function(e) {
		var content="" +"Kennung:"+e.row['kennungbetrieb'].value+"<br/>"
		+"Betrieb:"+e.row['betrieb'].value+"<br/>"
		+"Anschrift:"+e.row['anschrift'].value+"<br/>"
		+"Anlage:"+e.row['anlage'].value+"<br/>"
		+"Teilanlage:"+e.row['teilanlage'].value+"<br/>"
		+"Quelle:"+e.row['quelle'].value+"<br/>"
		+"Quellenbeschr.:"+e.row['quellenbeschreibung'].value+"<br/>"
		+"Ansprechpartner:"+e.row['ansprechpartner'].value+"<br/>"
		+"Höhe:"+e.row['hoehe'].value+"<br/>"
		+"Lage:"+e.row['lage'].value+"<br/>"
		+"Form:"+e.row['form'].value+"<br/>"
		+"Durchmesser:"+e.row['durchmesser'].value+"<br/>"
		+"Zugang:"+e.row['zugang'].value+"<br/>"
		+"Strom:"+e.row['strom'].value+"<br/>"
		+"Messstutzen:"+e.row['messstutzen'].value+"<br/>"
		+"Temperatur:"+e.row['temperatur'].value+"<br/>"
		+"Bbgasgeschw.:"+e.row['abgasgeschwindigkeit'].value+"<br/>"
		+"pdyn:"+e.row['dyndruck'].value+"<br/>"
		+"pstat:"+e.row['statdruck'].value+"<br/>"
		+"v:"+e.row['volumenstrom'].value+"<br/>"
		+"Komponenten:"+e.row['komponenten'].value+"<br/>"
		+"Bemerkung:"+e.row['bemerkung'].value;

		$( "#detailContent_MPQ" ).html(content);
		$( "#detailPanel_MPQ" ).panel( "open" );
		$( "#detailContent_MPQ" ).trigger( "updatelayout" );
		});

}

Controller.prototype.updateQuelle = function() {
	var deferred = new $.Deferred();
	var query = [];
	var rowID=-1;
	//set empty values
	
	query.push("UPDATE ");
	query.push(ctr.FT_ID_Quellen);
	query.push(" SET 'betrieb'='"+$("#betrieb_QDP").val()+"',");
	query.push(" 'anschrift'='"+$("#anschrift_QDP").val()+"',");
	query.push(" 'anlage'='"+$("#anlage_QDP").val()+"',");
	query.push(" 'quelle'='"+$("#quelle_QDP").val()+"',");
	query.push(" 'quellenbeschreibung'='"+$("#quellenbeschreibung_QDP").val()+"',");
	query.push(" 'ansprechpartner'='"+$("#ansprechpartner_QDP").val()+"',");
	query.push(" 'hoehe'='"+$("#hoehe_QDP").val()+"',");
	query.push(" 'lage'='"+$("#lage_QDP").val()+"',");
	query.push(" 'form'='"+$("#form_QDP").val()+"',");
	query.push(" 'durchmesser'='"+$("#durchmesser_QDP").val()+"',");
	query.push(" 'zugang'='"+$("#zugang_QDP").val()+"',");
	query.push(" 'strom'='"+$("#strom_QDP").val()+"',");
	query.push(" 'messstutzen'='"+$("#messstutzen_QDP").val()+"',");
	query.push(" 'temperatur'='"+$("#temperatur_QDP").val()+"',");
	query.push(" 'abgasgeschwindigkeit'='"+$("#abgasgeschwindigkeit_QDP").val()+"',");
	query.push(" 'dyndruck'='"+$("#dyndruck_QDP").val()+"',");
	query.push(" 'statdruck'='"+$("#statdruck_QDP").val()+"',");
	query.push(" 'volumenstrom'='"+$("#volumenstrom_QDP").val()+"',");
	query.push(" 'komponenten'='"+$("#komponenten_QDP").val()+"',");
	query.push(" 'bemerkung'='"+$("#bemerkung_QDP").val()+"'");
	query.push(" WHERE ROWID= '"+ctr.rowid_Q+"'");
	//alert(query.join(""));
	$.when(ctr.ft_queryPost(query.join(''))).then(function(data) {
		alert(JSON.stringify(data));
		if(data.rows!=null && data.rows.length>0)rowID=data.rows[0][0];
		deferred.resolve(rowID);
	});
    return deferred.promise();
}

Controller.prototype.drawMap_Q = function(container) {
	$("#"+container).empty();
	var zoom=10;
	ctr.map_Q = new google.maps.Map(document.getElementById(container), {
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
Controller.prototype.setMapSize = function(container) {
	$("#"+container).css('height', $(window).height() * 1 + "px");
	$("#"+container).css('width', $(window).width() * 0.98 + "px");
}

//fit map to bounds of layer
Controller.prototype.fitMapBounds = function(map,list,geometryCol) {
	var bounds = new google.maps.LatLngBounds();

	for(var i = 0; i < list.length; i++) {
		if(list[i][geometryCol].geometry!=null){  
			var point = new google.maps.LatLng(
					list[i][geometryCol].geometry.coordinates[1],
      		  list[i][geometryCol].geometry.coordinates[0]);
			bounds.extend(point);
		}
	}
	// zoom to the bounds
	map.fitBounds(bounds);
	google.maps.event.addListenerOnce(map, 'bounds_changed', function(event) {
      if (this.getZoom()){
          this.setZoom(this.getZoom()-2);
      }
});
}


//photos
//init all albums
Controller.prototype.initPicasaAlbums = function() {

	$.each(ctr.picasaAlbums, function (index, album) {
			$.when(ctr.getGoogleAlbum(album.userID,album.albumID,album.authKey)).then(function(data) {
				album.title=data.feed.title;
				album.author=data.feed.author.name;
				album.webUrl=data.feed.author.uri;
				album.photoList=data.feed.entry;
			});
		});
}

//get album data
Controller.prototype.getGoogleAlbum = function(userID,albumID,authKey) {
	var deferred = new $.Deferred();
	var domain="https://picasaweb.google.com";

	var url="https://picasaweb.google.com/data/feed/base/user/"+userID+"/albumid/"+albumID+"?alt=json&kind=photo&authkey="+authKey+"&hl=en_US";

	$.when(ctr.queryGet(url)).then(function(data) {
		deferred.resolve(data);
	});
	return deferred.promise();
}

Controller.prototype.getGooglePhotosFromPos = function(posSearch,maxDistance) {
	var pointStr;
	var lat;
	var lng;
	var posImage;
	var distance;
	photoList=[];
	
	$.each(ctr.picasaAlbums, function (index, album) {
		$.each(album.photoList, function (index, photo) {
			if(photo.georss$where && photo.georss$where.gml$Point && photo.georss$where.gml$Point.gml$pos)
				{
				pointStr=photo.georss$where.gml$Point.gml$pos.$t;
				lat=pointStr.split(" ")[1];
				lng=pointStr.split(" ")[0];
				posImage = new google.maps.LatLng(lat,lng);
				distance= ctr.calculateDistance(posSearch, posImage);
				if(distance<maxDistance)photoList.push(photo);
				}

		});
	});
	return photoList;
}


//util functions

Controller.prototype.getPosition = function() {
    var deferred = $.Deferred();
    navigator.geolocation.getCurrentPosition(function (position) {
		var pos = new google.maps.LatLng(position.coords.longitude,	position.coords.latitude);
		deferred.resolve(pos);
    }, function (error) {
        deferred.reject();
    });
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
Controller.prototype.ft_queryGet = function(query) {
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
Controller.prototype.ft_queryPost = function(query) {
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

Controller.prototype.queryGet=function(url) {
	// Send the JSONP request using jQuery
	return $.ajax({
		url : url,
		dataType : 'jsonp',
		cache: false
	});
}


Controller.prototype.calculateDistance =function(location1,location2)
{
    var d=-1;
    if(location1!=null && location2!=null)
    {
    var R = 6371;
	var dLat = ctr.toRad(location2.lat()-location1.lat());
	var dLon = ctr.toRad(location2.lng()-location1.lng());
	var dLat1 = ctr.toRad(location1.lat());
	var dLat2 = ctr.toRad(location2.lat());
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(dLat1) * Math.cos(dLat1)* Math.sin(dLon/2) * Math.sin(dLon/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	d = R * c;
	}
	return d;
}

Controller.prototype.toRad=function(deg) 
{
		return deg * Math.PI/180;
}
