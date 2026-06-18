// Copyright University of Massachusetts Dartmouth 2013
//
// Designed and built by James P. Burke and Jason Orrill
// Modified and developed by Hakan Sandir
//
// This Javascript version of Fraction Bars is based on
// the Transparent Media desktop version of Fraction Bars,
// which in turn was based on the original TIMA Bars software
// by John Olive and Leslie Steffe.
// We thank them for allowing us to update that product.



function Utilities() {
	this.shiftKeyDown = false ;
	this.ctrlKeyDown = false ;
}

//First attempt
Utilities.file_list="";
Utilities.file_index=0;
//

Utilities.flag=['it,sp,rpt,lng'];
Utilities.flag[0]=false;
Utilities.flag[1]=false;
Utilities.flag[2]=false;
Utilities.flag[3]=false;
Utilities.USE_CURRENT_SELECTION = 'useCurrent' ;
Utilities.USE_LAST_SELECTION = 'useLast' ;


Utilities.include_js = function (file,path) {
	if (typeof(path) !== 'undefined' && path !== null) {
		file = path + file ;
	}
	var include_file = document.createElement('script');
	include_file.type = 'text/javascript';
	include_file.src = file;
	document.getElementsByTagName('head')[0].appendChild(include_file);
};

Utilities.createFraction = function(numerator, denominator) {
  // Calculate the (approximate) fraction for this measurement.
  // Basic algorigm taken from Dr. Math at the Math Forum...
  // http://mathforum.org/library/drmath/view/51910.html

  var max_terms = 30 ;
  var min_divisor = 0.000001 ;
  var max_error = 0.00001 ;

  var v = numerator / denominator ;
  var f = v ;

  var n1 = 1 ;
  var d1 = 0 ;
  var n2 = 0 ;
  var d2 = 1 ;

  var a ;

  for (i = 0; i < max_terms; i++) {
    a = Math.round(f) ;
    f = f - a ;
    n = n1 * a + n2 ;
    d = d1 * a + d2 ;

    n2 = n1 ;
    d2 = d1 ;

    n1 = n ;
    d1 = d ;

    if (f < min_divisor && Math.abs(v-n/d) < max_error) {
      break ;
    }

    f = 1/f ;
  }

  if (Math.floor(v) == v) {
  	return v ;
  }
  else{
  	return Math.abs(n) + "/" + Math.abs(d) ;
  }
};

Utilities.log = function(msg) {
	if( window.console ) {
		console.log( msg ) ;
	}
};

Utilities.colorLuminance = function(hex, lum) {

  // validate hex string
  hex = String(hex).replace(/[^0-9a-f]/gi, '');
  if (hex.length < 6) {
    hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  }
  lum = lum || 0;

  // convert to decimal and change luminosity
  var rgb = "#", c, i;
  for (i = 0; i < 3; i++) {
    c = parseInt(hex.substr(i*2,2), 16);
    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
    rgb += ("00"+c).substr(c.length);
  }

  return rgb;
};

Utilities.getMarkedIterateFlag = function() {
  // Returns false by default
  state = ($('#marked-iterate').attr('data-flag') === "true");
  return state;
};
