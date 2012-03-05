searchOffset=0, catOffset=0, loading = false; welcome = true; wishlist = {}, note = true, base_url="http://ec2-184-72-161-225.compute-1.amazonaws.com:5984/stylematic/_design/prods/_view", search_url="http://ec2-184-72-161-225.compute-1.amazonaws.com:9200/stylematic/stylematic/_search?";
wishlist = {
	data: $.jStorage.get("wishlist", {}),
	el: $("#wish-history"),
	add: function(doc){
		date = new Date(), id=doc._id;
		container = (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear()
		wishlist.data[doc._id] = {"added": date.getTime() , "doc": doc}
		if(!$("ul[date='"+container+"']", wishlist.el).length){wishlist.el.append("<h4>"+container+"</h4><div timestamp='"+date.getTime()+"' class='scrollThumbs' data-scroll='x'><ul class='ui-scrollview-view' date='"+container+"'></ul></div>")}
		$('<li><a href="recommendation.html?p='+doc._id+'" class="pwrap" pid="'+doc._id+'"><img src="'+doc.taggedImage+'"/></a></li>').data("product", doc).appendTo("ul[date='"+container+"']", wishlist.el)
		$.jStorage.set("wishlist", wishlist.data)
		_kmq.push(['record', 'wishlist-add', {'id':doc._id}]);
	},
	remove: function(id){
		delete wishlist.data[id];
		$("li a[pid="+id+"]", wishlist.el).parent().remove()
		$.jStorage.set("wishlist", wishlist.data)
		_kmq.push(['record', 'wishlist-delete', {'id':id}]);
	},
	render: function(){
		wishlist.el.empty()
		for(i in wishlist.data){
			date = new Date(wishlist.data[i].added)
			container = (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear()
			if(!$("ul[date='"+container+"']", wishlist.el).length){wishlist.el.append("<h4>"+container+"</h4><div timestamp='"+date.getTime()+"' class='scrollThumbs' data-scroll='x'><ul class='ui-scrollview-view' date='"+container+"'></ul></div>")}
			$('<li><a href="recommendation.html?p='+wishlist.data[i].doc._id+'" class="pwrap" pid="'+wishlist.data[i].doc._id+'"><img src="'+wishlist.data[i].doc.taggedImage+'"/></a></li>').data("product", wishlist.data[i].doc).appendTo("ul[date='"+container+"']", wishlist.el)
		}
	},
	exists: function(id){
		for(i in wishlist.data){
			if(id == i) return true;
		}
		return false;
	}
}
$( "#recommendations, #wishlist, #profile, #feed, #snaprecs").live( "pageshow", function(event) {
		var $page = $( this );
		wishlist.el =  $("#wish-history")
		wishlist.render();
		$page.find( ":jqmData(scroll):not(.ui-scrollview-clip)" ).each(function () {
			var $this = $( this );
			// XXX: Remove this check for ui-scrolllistview once we've
			//      integrated list divider support into the main scrollview class.
			if ( $this.hasClass( "ui-scrolllistview" ) ) {
				$this.scrolllistview();
			} else {
				var st = $this.jqmData( "scroll" ) + "",
					paging = st && st.search(/^[xy]p$/) != -1,
					dir = st && st.search(/^[xy]/) != -1 ? st.charAt(0) : null,

					opts = {
						direction: dir || undefined,
						paging: paging || undefined,
						scrollMethod: $this.jqmData("scroll-method") || undefined
					};

				$this.scrollview( opts );
			}
		});
	});
$(document).bind("pagechange", function( event, data ) {
	event.stopPropagation();
	event.preventDefault();
	if(!data.options.fromPage) data.options.fromPage = {"attr": function(){}}
	if(data.toPage.attr("id") == "menu"){
		retailCategoryMenu()
	}else if(data.toPage.attr("id") == "category"){
		fetchCategory();
	}else if(data.toPage.attr("id") == "recommendations"){
		setupRecs();
	}else if(data.toPage.attr("id") == "feed"){
		feedSetup();
	}else if(data.toPage.attr("id") == "snapform"){
		snapform();
	}else if(data.toPage.attr("id") == "snaprecs"){
		setup_snaprecs();
	}
	return false;
});

$("#share").live("click", function(){
	_kmq.push(['record', 'fb-share']);
});
$("document").ready(function(){
	$.mobile.fixedToolbars.setTouchToggleEnabled(false);

	$("#retailer").live( "change", function(event, ui) {
		event.preventDefault();
		event.stopPropagation();
		$.mobile.changePage("menu.html");
		return false;
	});
	$("#filter").live('keyup', function(){
		value = $(this).attr("value");
		$("#category>ul li").hide()
		$("#category>ul li").each(function(){
			p = $(this).data('product')
			str=p.name.toLowerCase()+" "+p.colorName.toLowerCase()+" "+p.retailer
			if(str.match(value)){
				$(this).show()
			}
		});
	});
	$("#emailform").submit(function(e){
		e.preventDefault();
		msg = "Name: " + $("input[name='name']", this).val() + "\n"
		msg += "Email: " + $("input[name='email']", this).val() + "\n"
		$("#profile .scrollThumbs").each(function(){
			msg += $(this).prev("h4").text() + " " 
			$("li.on", this).each(function(){
				if($("span.name", this).length){ msg += $("span.name", this).text() + ", " }
				else { msg += $(this).attr("label") + ", " }
			})
			msg += "\n"
		})
		msg += "Favorite stores: " + $("input[name='stores']", this).val() + "\n"
		msg += "Favorite outfit: " + $("input[name='outfit']", this).val() + "\n"
		msg += "Interests: " 
		$("#interests input:checked").each(function(){
			msg += $(this).next("label").text() + ", "
		})
		msg += "\n"
		$.getJSON("http://ec2-107-22-134-231.compute-1.amazonaws.com/email.php?body="+encodeURIComponent(msg)+"&callback=?", function(resp){
			if(resp.success){
				$.mobile.changePage("#thanks", {role: 'dialog'})
			}
		})
		
		
		return false;
	});
	$(window).scroll(function(){
		if(!loading && $(".search:visible h3:visible").length && ($("#searchresults").is(":visible") || $("#category").is(":visible"))){
			if(($(window).scrollTop()+$(window).height()) > ($(".search:visible h3:visible").position().top + 30)){
				if($("#searchresults").is(":visible") && $("#searchresults>ul li").length){
					$(".search:visible h3").text("Loading...")
					searchget($("#searchresults").data("query"))
					loading = true;
				}
				if($("#category").is(":visible") && $("#category>ul li").length){
					$(".search:visible h3").text("Loading...")
					catget()
					loading = true;
				}
			}
		}
	});
	
});
$("#wish").live("click", function(){
	if($(".ui-icon", this).is(".ui-icon-minus")){wishlist.remove($("li.large").attr("pid"))}
	else{wishlist.add($("li.large").data("product"))}
	$("#wish .ui-icon").toggleClass("ui-icon-minus").toggleClass("ui-icon-plus")
	return false;
})
$("#buy").live("click", function(){
	_kmq.push(['record', 'referral', {'url': $(this).attr("href")}]);
	return true;
});
$("#refresh").live("click", function(){
	//history push doc._id
	return true;
});
/*$("div.search li, #wish-history li").live("click", function(){
	if(!$.mobile.pageData) $.mobile.pageData = {}
	$.mobile.pageData.p = ($(this).attr("pid")) ? $(this).attr("pid") : $("a.pwrap", this).attr("pid")
	doc = $(this).data("product");
	$("#recommendations ul#product li.large")
		.html("<img src='"+doc.taggedImage+"'><div></div><span class='name'>"+doc.name+"</span><span class='color'>"+doc.retailer+", "+doc.priceLabel+"</span>")
		.attr("pid", doc._id)
		.data("product", doc)
	$("#recommendations ul#product li#orig")
		.html("<img src='"+doc.taggedImage+"'>")
		.attr("pid", doc._id)
		.data("product", doc)
		.hide()
	$("#buy").attr("href", doc.url)
	if(wishlist.exists(doc._id)) $("#wish").addClass("off")
	else $("#wish").removeClass("off")
	$.mobile.changePage($("#recommendations"));
});*/

/*$("div.deals li").live("click", function(){
	if(!$.mobile.pageData) $.mobile.pageData = {}
	$.mobile.pageData.r = parseInt($(this).attr("retailer"))
	$.mobile.changePage($("#menu"));
});*/
$("li a.remove").live("click", function(e){
	el = $(this).parent();
	el.removeClass("active");
	combo.remove($("img", el).attr("src"))
	e.stopPropagation();
	e.preventDefault();
	return false;
});
$("div.item").live("click", function(){
	if(!$(this).is(".empty")){
		if($("a.remove", this).is(":visible")) $("a.remove", this).hide()
		else $("a.remove", this).show()
	}
});
$("div.item a.remove").live("click", function(e){
	e.stopPropagation();
	e.preventDefault();
	img = $(this).siblings("img");
	$("li[pid="+img.attr("pid")+"]").removeClass("active");
	combo.remove(img.attr("src"));
	$(this).hide();
	return false;
});
$("ul.recs li").live("click", function(){
	if(!$(this).is("active")){
		var me = $(this)
		if(!$("a.action:visible", this).length){
			$('div, span.color, span.name', me).animate({
				height: '0'
			}, 300, function() {
				$("a.action", me).css({"display": "inline", "height":"0px"})
				$('div', me).animate({
					height: '45px'
				}, 300);
				$('a.action', me).animate({
					height: '28px'
				}, 300);
			});
		} else {
			$('div, a.action', me).animate({
				height: '0'
			}, 300, function() {
				$("a.action", me).css({"display": "none"})
				$('div', me).animate({
					height: '45px'
				}, 300);
				$('span.color', me).animate({
					height: '12px'
				}, 300);
				$('span.name', me).animate({
					height: '16px'
				}, 300);
			});
		}
	}
});
$("ul.recs li a.hide").live("click", function(){
	el = $(this).parent();
	$("li[pid='"+el.attr("pid")+"'], li a[pid='"+el.attr("pid")+"'], li[pid='"+el.attr("pid")+"'] img, li a[pid='"+el.attr("pid")+"'] img").slideUp("fast");
})
$("ul.recs li a.add").live("click", function(e){
	el = $(this).parent();
	if(!$(".combo", el.parent().parent()).length){$("div.combo").clone().appendTo(el.parent().parent()).page().show()}
	empties = combo.add($("img", el).attr("src"), el.attr("pid"))
	if(!empties) $("ul.recs li a.add").addClass('ui-disabled')
	if(!empties.error) el.addClass("active");
	e.stopPropagation();
	e.preventDefault();
	return false;
})
$("#recommendations ul#product li#orig").live("click", function(){
	doc = $(this).data("product")
	$(this).hide();
	$("#recommendations li.on").removeClass("on")
	$("#buy").attr("href", doc.url)
	$("#refresh").attr("href", "recommendation.html?p=" + doc._id + ((getParameterByName('r'))?"&r="+getParameterByName('r'):""))
	$("#recommendations ul#product li.large")
		.html("<img src='"+doc.taggedImage+"'><div></div><span class='name'>"+doc.name+"</span><span class='color'>"+doc.retailer+", "+doc.priceLabel+"</span>")
		.attr("pid", doc._id)
		.data("product", doc)
});
$("#snaprecs ul#product li#orig").live("click", function(){
	$(this).hide();
	$("#snaprecs li.on").removeClass("on")
	$("#snaprecs #buy").attr("href", "")
	$("#snaprecs #refresh").attr("href", "#")
	$("#snaprecs ul#product li.large").html("<img src='images/snap/snap"+getParameterByName('src')+".jpg'>")
});
$("#profile .ui-scrollview-view li").live("click", function(event){
	if($.util.WasScrolling()) {
        event.stopPropagation();
        return false;
    }
	$(this).toggleClass("on")
})
$("#recommendations .ui-scrollview-view li, #wishlist .ui-scrollview-view li").live("click", function(event){
	if($.util.WasScrolling()) {
        event.stopPropagation();
        return false;
    }
	doc = $(this).data("product")
	$("#recommendations li.on").removeClass("on")
	$(this).addClass("on")
	$("#recommendations ul#product li#orig").show()
	$("#recommendations ul#product li.large")
		.html("<img src='"+doc.taggedImage+"'><div></div><span class='name'>"+doc.name+"</span><span class='color'>"+doc.retailer+", "+doc.priceLabel+"</span>")
		.attr("pid", doc._id)
		.data("product", doc)
	$("#buy").attr("href", doc.url)
	$("#refresh").attr("href", "recommendation.html?p=" + doc._id + ((getParameterByName('r'))?"&r="+getParameterByName('r'):""))
	if(wishlist.exists(doc._id)) $("#wish .ui-icon").removeClass("ui-icon-plus").addClass("ui-icon-minus")
	else $("#wish .ui-icon").removeClass("ui-icon-minus").addClass("ui-icon-plus")
})
$("#snaprecs .ui-scrollview-view li").live("click", function(event){
	if($.util.WasScrolling()) {
        event.stopPropagation();
        return false;
    }
	doc = $(this).data("product")
	$("#snaprecs li.on").removeClass("on")
	$(this).addClass("on")
	$("#snaprecs ul#product li#orig").show()
	$("#snaprecs ul#product li.large")
		.html("<img src='"+doc.taggedImage+"'><div></div><span class='name'>"+doc.name+"</span><span class='color'>"+doc.retailer+", "+doc.priceLabel+"</span>")
		.attr("pid", doc._id)
		.data("product", doc)
	$("#buy").attr("href", doc.url)
	$("#refresh").attr("href", "recommendation.html?p=" + doc._id + ((getParameterByName('r'))?"&r="+getParameterByName('r'):""))
	if(wishlist.exists(doc._id)) $("#wish .ui-icon").removeClass("ui-icon-plus").addClass("ui-icon-minus")
	else $("#wish .ui-icon").removeClass("ui-icon-minus").addClass("ui-icon-plus")
})
function retailCategoryMenu(){
	if(!$.mobile.pageData){
		$.mobile.pageData = {}
	}
	if(getParameterByName('r')){
		$.mobile.pageData.r = getParameterByName('r')
	}else if ($("#retailer").val()){
		$.mobile.pageData.r = $("#retailer").val()
	} else {
		$.mobile.changePage("index.html")
	}
	
	var id = parseInt($.mobile.pageData.r)
	_kmq.push(['record', 'browse_menu', {'retailer':id}]);
	$("#menu h1").text($("#retailer option[value="+id+"]").text())
	$("#menu>ul").empty()
	$.mobile.showPageLoadingMsg();
	$.getJSON(base_url + "/store_metacategories?reduce=true&group=true&callback=?", function(resp){
		$("#menu>ul").empty()
		if(resp.rows.length){
			$.each(resp.rows, function(i, row){
				if(row.key[0] == id){
					var menuitem = $("<li><a href='category.html?r="+id+"&c="+row.key[1]+"' rel='"+row.key[1]+"'><div></div><span class='name'>"+row.key[1]+"</span></a></li>")
					menuitem.appendTo("#menu>ul")
					$.getJSON(base_url+'/store_metacategories?key=['+id+',%20"'+row.key[1]+'"]&reduce=false&limit=1&include_docs=true&callback=?', function(resp){
						if(resp.rows.length){
							$("a", menuitem).prepend("<img src='"+resp.rows[0].doc.taggedImage+"'/>")
						}
					})
				}
			});
		}
		$.mobile.hidePageLoadingMsg();
	});
}
function fetchCategory(){
	if(getParameterByName('r') && !$.mobile.pageData){
		$.mobile.pageData = {r: getParameterByName('r')}
	}else if($("#retailer").val() || !$.mobile.pageData){
		$.mobile.pageData = {r: $("#retailer").val()}
	}
	if(getParameterByName('c')){
		$.mobile.pageData.c = getParameterByName('c')
	}
	
	if(!$.mobile.pageData.c || !$.mobile.pageData.r){
		$.mobile.changePage("index.html");
	}
	var id = parseInt($.mobile.pageData.r)
	_kmq.push(['record', 'browse_category', {'retailer':id, 'category': $.mobile.pageData.c}]);
	$("#category h1").text($("#retailer option[value="+id+"]").text())
	$("#category>ul").empty()
	$("#filter").val("Filter search results")
	
	catOffset = 0;
	catget()
	$(".search:visible h3").show()
}
function catget(){
	$.mobile.showPageLoadingMsg();
	var id = parseInt($.mobile.pageData.r)
	$.getJSON(base_url + "/store_metacategories?key=["+id+",%20%22"+$.mobile.pageData.c+"%22]&reduce=false&include_docs=true&limit=30&skip="+catOffset+"&callback=?", function(resp){
		if(resp.rows.length){
			$.each(resp.rows, function(r, row){
				if(!$("#category li a[pid="+row.id+"]").length){
					$('<li><a href="recommendation.html?r='+id+'&p='+row.id+'" class="pwrap" pid="'+row.id+'"><img src="'+row.doc.taggedImage+'"/><div></div><span class="name">'+row.doc.name+'</span></a></li>')
						.data('product', row.doc)
						.trigger("create")
						.appendTo("#category>ul")
				}
			});
		} else {
			$(".search:visible h3").hide()
		}
		$.mobile.hidePageLoadingMsg();
		if(catOffset == 0) $(".search:visible h3").show()
		catOffset += 30;
		$(".search:visible h3").text("Load more items")
		loading = false;
	})
}
function setupRecs(){
	if(!$.mobile.pageData) $.mobile.pageData = {}
	if(getParameterByName('p')) $.mobile.pageData.p = getParameterByName('p')
	if(getParameterByName('r')) $.mobile.pageData.r = getParameterByName('r')
	if((!$("#recommendations li.large").attr("pid")) && $.mobile.pageData.p){
		$(".scrollThumbs").scrollview("scrollTo", 0, 0);
		$.mobile.showPageLoadingMsg();
		$.getJSON("http://ec2-184-72-161-225.compute-1.amazonaws.com:5984/stylematic/"+$.mobile.pageData.p+"?callback=?", function(doc){
			if(!doc.error){
				$("#recommendations ul#product li.large")
					.html("<img src='"+doc.taggedImage+"'><div></div><span class='name'>"+doc.name+"</span><span class='color'>"+doc.retailer+", "+doc.priceLabel+"</span>")
					.attr("pid", doc._id)
					.data("product", doc)
				$("#recommendations ul#product li#orig")
					.html("<img src='"+doc.taggedImage+"'>")
					.attr("pid", doc._id)
					.data("product", doc)
					.hide()
				$("#buy").attr("href", doc.url)
				$("#refresh").attr("href", "recommendation.html?p=" + doc._id + ((getParameterByName('r'))?"&r="+getParameterByName('r'):""))
				if(wishlist.exists(doc._id)) $("#wish .ui-icon").removeClass("ui-icon-plus").addClass("ui-icon-minus")
				else $("#wish .ui-icon").removeClass("ui-icon-minus").addClass("ui-icon-plus")
				fetchRecs();
			} else {
				$.mobile.changePage("index.html")
			}
		})
	}else{
		if($.mobile.pageData){
			window.location.hash = ($.mobile.pageData.r)?"#recommendations?r=" + $.mobile.pageData.r + "&p=" + $.mobile.pageData.p : "#recommendations?p=" + $.mobile.pageData.p;
		}else{
			$.mobile.changePage("index.html")
		}
		fetchRecs();
	}
}
function fetchRecs(){
	$("ul#similar").empty()
	$("ul#complementary").empty()
	$(".scrollThumbs").scrollview("scrollTo", 0, 0);
	$.getJSON(search_url+"size=20&source="+JSON.stringify(querybuilder($("ul#product li.large").data("product"), "similar")), function(resp){
		if(resp.hits.hits.length){
			$.each(resp.hits.hits, function(r, row){
				$("<li pid='"+row._source._id+"'><img src='"+row._source.taggedImage+"'/></li>")
				.data("product", row._source)
				.appendTo("#similar")
			})
		}
		$.mobile.hidePageLoadingMsg();
	});
	$.getJSON(search_url+"size=20&source="+JSON.stringify(querybuilder($("ul#product li.large").data("product"), "complementary")), function(resp){
		if(resp.hits.hits.length){
			$.each(resp.hits.hits, function(r, row){
				$("<li pid='"+row._source._id+"'><img src='"+row._source.taggedImage+"'/></li>")
				.data("product", row._source)
				.appendTo("#complementary")
			})
		}
		$.mobile.hidePageLoadingMsg();
	});
}
var combo = {
	add: function(url, pid){
		if($("div.combo:visible div.empty").length){
			$("div.combo:visible div.empty span").each(function(){
				$("<img src=\""+url+"\" pid=\""+pid+"\"/>").appendTo($(this))
				$(this).parent().removeClass("empty")
				return false;
			});
		} else{
			return {"error": "No more room!"}
		}
		if($("div.combo:visible div.empty").length){
			return true;
		} else {
			$("div.combo:visible").addClass("complete")
			return false;
		}
	},
	remove: function(url){
		$("div.combo:visible div.item img").each(function(){
			if($(this).attr("src") == url){
				$(this).parent().parent().addClass("empty")
				$(this).remove();
				$("ul.recs li a.add").removeClass('ui-disabled')
			}
		})
		$("div.combo:visible").removeClass("complete")
	}
}
$("form.searchform").live("submit", function(e){
	e.preventDefault();
	e.stopPropagation();
	if( $.mobile.activePage.attr("id") != "searchresults"){
		$.mobile.changePage("#searchresults")
	}
	search($("input", $(this)).val())
	return false;
});
function search(query){
	
	
	$("#searchresults>ul").empty()
	$("#searchresults input").val(query)
	if(!$.mobile.pageData) $.mobile.pageData = {r:""}
	$.mobile.pageData.q = encodeURIComponent(query)
	if($.mobile.pageData.r){
		query = encodeURIComponent(query) + "AND retailerId:" + $.mobile.pageData.r
	}
	_kmq.push(['record', 'search', {'query':query}]);
	$("#searchresults").data("query", query)
	searchOffset = 0;
	searchget(query)
}
function searchget(query){
	$.mobile.showPageLoadingMsg();
	$.getJSON(search_url+"q="+query+"&size=30&from="+searchOffset, function(resp){
		if(resp.hits.hits.length){
			$.each(resp.hits.hits, function(r, row){
				if(!$("#searchresults li a[pid="+row._source._id+"]").length){
					href= '"recommendation.html?p='+row._source._id+'"'
					if($.mobile.pageData.r) href= '"recommendation.html?r='+$.mobile.pageData.r+'&p='+row._source._id+'"'
					$('<li><a href='+href+' class="pwrap" pid="'+row._source._id+'"><img src="'+row._source.taggedImage+'"/><div></div><span class="name">'+row._source.name+'</span></a></li>')
						.data("product", row._source)
						.trigger("create")
						.appendTo("#searchresults>ul")
				}
			})
		} else {
			$(".search:visible h3").hide()
		}
		$.mobile.hidePageLoadingMsg();
		if(searchOffset == 0) $(".search:visible h3").show()
		searchOffset += 30;
		$(".search:visible h3").text("Load more items")
		loading = false;
	});
}
var crossCategory = {
	"Pants" : ["Skirts", "Dresses"],
	"Dresses": ["Tops", "Skirts", "Pants"],
	"Skirts": ["Dresses", "Pants"],
	"Tops": ["Dresses"]
}
function querybuilder(doc, type){
	q = {"query":{"query_string":{"fields":["name","colorName","categories^2","categoryNames", "tags^3", 'metaCategory'],"query":""}}}
	qs = doc.colorName + " " + doc.name

	for(i in doc.tags){
		qs += " " + doc.tags[i].split("#")[1]
	}
	if(type=="similar"){
		for(i in doc.categories){
			qs += " OR categories:"+doc.categories[i]
		}
		for(i in doc.metaCategory){
			qs += " OR metaCategory:"+doc.metaCategory[i]
		}
	}
	else if(type=="complementary"){
		for(i in doc.categories){
			qs += " NOT categories:"+doc.categories[i]
		}
		for(i in doc.metaCategory){
			qs += " NOT metaCategory:"+doc.metaCategory[i]			
			if(crossCategory[doc.metaCategory[i]]){
				for(j in crossCategory[doc.metaCategory[i]]){
					qs += " NOT metaCategory:"+crossCategory[doc.metaCategory[i]][j]
				}
			}
		}
	}
	if($.mobile.pageData.r){
		qs += " AND retailerId:"+$.mobile.pageData.r
	}
	qs += " NOT _id="+doc._id
	qs = qs.replace("&", "")
	q.query.query_string.query = qs;
	return q;
}
function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.href);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

function feedSetup(){
	q = JSON.stringify({"query":{"query_string":{"fields":["name","colorName","categories^2","categoryNames", "tags^3", 'metaCategory'],"query":"colorName:gray OR colorName:black OR colorName:red OR colorName:pink OR pencil skirt OR ankle boot OR cardigan OR wedges OR bootie"}}})
	recentIDs = ["0ea7bf4eb82934a8ffd11d2fdeb7a5c6","0ea7bf4eb82934a8ffd11d2fdebec58a","0ea7bf4eb82934a8ffd11d2fde57697f","948ba077020065532f5e926d66007b8d","cd99c8e0dd99531e915e52e31d724b9d","cd99c8e0dd99531e915e52e31d4e9490","1170edf47dd4e24e9807c65af6d439ca","0ea7bf4eb82934a8ffd11d2fde4792ba","948ba077020065532f5e926d66f5de13","8ab6359d860026f3a19bd7b2f53ac6b5","0ea7bf4eb82934a8ffd11d2fdebb0f17","2ba14935ca96876281b2c8f0e72e143f","8ab6359d860026f3a19bd7b2f51a317d","8ab6359d860026f3a19bd7b2f55d1182","2ba14935ca96876281b2c8f0e72e143f","0ea7bf4eb82934a8ffd11d2fdebf2dee","948ba077020065532f5e926d66f5de13","0ea7bf4eb82934a8ffd11d2fdebb0f17","8ab6359d860026f3a19bd7b2f53ac6b5"]
	$.mobile.showPageLoadingMsg();
	if(!$("#personal_recs>ul li").length){
		$.getJSON(search_url+"source="+q+"&size=30", function(resp){
			if(resp.hits.hits.length){
				$.each(resp.hits.hits, function(r, row){
					if(!$("#personal_recs li a[pid="+row._source._id+"]").length){
						href= '"recommendation.html?p='+row._source._id+'"'
						if($.mobile.pageData){if($.mobile.pageData.r) href= '"recommendation.html?r='+$.mobile.pageData.r+'&p='+row._source._id+'"'}
						$('<li><a href='+href+' class="pwrap" pid="'+row._source._id+'"><img src="'+row._source.taggedImage+'"/></a></li>')
							.data("product", row._source)
							.trigger("create")
							.appendTo("#personal_recs>ul")
					}
				});
			}
			$.mobile.hidePageLoadingMsg();
		});
	} else{
		$.mobile.hidePageLoadingMsg();
	}
	if(!$("#recent_activity>ul li").length){
		for(i in recentIDs){
			$.getJSON("http://ec2-184-72-161-225.compute-1.amazonaws.com:5984/stylematic/"+recentIDs[i]+"?callback=?", function(r){
				if(!r.error){
					if(!$("#recent_activity li a[pid="+r._id+"]").length){
						href= '"recommendation.html?p='+r._id+'"'
						if($.mobile.pageData){if($.mobile.pageData.r) href= '"recommendation.html?r='+$.mobile.pageData.r+'&p='+r._id+'"'}
						$('<li><a href='+href+' class="pwrap" pid="'+r._id+'"><img src="'+r.taggedImage+'"/></a></li>')
							.data("product", r)
							.trigger("create")
							.appendTo("#recent_activity>ul")
					}
				}
				$.mobile.hidePageLoadingMsg();
			})
		}
	} else{
		$.mobile.hidePageLoadingMsg();
	}
}
function snapform(){
	if(getParameterByName('src')){
		$("#snapform li.large").html("<img src='images/snap/snap"+getParameterByName('src')+".jpg'>")
		$("#snapform form").submit(function(e){
			e.stopPropagation();
			e.preventDefault();
			color = $("select[name='snap-color']").val(), cat = $("select[name='snap-type']").val()
			q = "colorName:"+color+" metaCategory:"+cat+" "+$("input[name='snap-desc']").val()
			cq = "colorName:"+color+" NOT metaCategory:"+cat
			if(crossCategory[cat]){
				for(j in crossCategory[cat]){
					cq += " NOT metaCategory:"+crossCategory[cat][j]
				}
			}

			//console.log(q, cq);
			$.mobile.changePage("snaprecs.html?src="+getParameterByName('src')+"&q="+q+"&cq="+cq)
		})
	}
}
function setup_snaprecs(){
	if(getParameterByName('src')){
		$("#snaprecs li.large").html("<img src='images/snap/snap"+getParameterByName('src')+".jpg'>")
		$("#snaprecs li#orig").html("<img src='images/snap/snap"+getParameterByName('src')+".jpg'>").hide()
	}
	$("#snaprecs ul#similar").empty()
	$("#snaprecs ul#complementary").empty()
	try{
		$("#snaprecs .scrollThumbs").scrollview("scrollTo", 0, 0);
	}catch(e){
	}
	if(getParameterByName('q')){
		$.getJSON(search_url+"size=20&source="+JSON.stringify({"query":{"query_string":{"fields":["name","colorName","categories^2","categoryNames", "tags^3", 'metaCategory'],"query":getParameterByName('q')}}}), function(resp){
			if(resp.hits.hits.length){
				$.each(resp.hits.hits, function(r, row){
					$("<li pid='"+row._source._id+"'><img src='"+row._source.taggedImage+"'/></li>")
					.data("product", row._source)
					.appendTo("#snaprecs #similar")
				})
			}
			$.mobile.hidePageLoadingMsg();
		});
	}
	if(getParameterByName('cq')){
		$.getJSON(search_url+"size=20&source="+JSON.stringify({"query":{"query_string":{"fields":["name","colorName","categories^2","categoryNames", "tags^3", 'metaCategory'],"query":getParameterByName('cq')}}}), function(resp){
			if(resp.hits.hits.length){
				$.each(resp.hits.hits, function(r, row){
					$("<li pid='"+row._source._id+"'><img src='"+row._source.taggedImage+"'/></li>")
					.data("product", row._source)
					.appendTo("#snaprecs #complementary")
				})
			}
			$.mobile.hidePageLoadingMsg();
		});
	}
}