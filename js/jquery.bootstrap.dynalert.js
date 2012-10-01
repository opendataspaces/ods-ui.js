/*
	Copyright (c) <2012> Sebastian Trueg <trueg@openlinksw.com>
	
	Permission is hereby granted, free of charge, to any person obtaining
	a copy of this software and associated documentation files (the
	"Software"), to deal in the Software without restriction, including
	without limitation the rights to use, copy, modify, merge, publish,
	distribute, sublicense, and/or sell copies of the Software, and to
	permit persons to whom the Software is furnished to do so, subject to
	the following conditions:
	
	The above copyright notice and this permission notice shall be
	included in all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
	NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
	LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
	OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
	WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Adds a bootstrap alert of the given type as the first child element
 * of the element in focus.
 */

;(function($){
    $.fn.extend({
        dynalert: function(msg, options) {
            this.defaultOptions = {
              timeout: 2000,
              type: "info"
            };

            var settings = $.extend({}, this.defaultOptions, options);

            return this.each(function() {
                var $this = $(this);

                // hide the alert
                if(msg === false) {
                  if($this.children().length > 0 &&
                     $($this.children()[0]).hasClass("alert"))
                    $($this.children()[0]).remove();
                }
                else {
                  // build the alert
                  var alert = $(document.createElement('div'));
                  alert.addClass("alert alert-block fade in");
                  alert.addClass("alert-" + settings.type);
                  alert.append('<button type="button" class="close" data-dismiss="alert">&times;</button>');
                  alert.append($(document.createElement('span')).text(msg));
                
                  // add it into the DOM
                  $this.prepend(alert);

                  // hide it after the timeout
                  alert.delay(settings.timeout).fadeOut("slow");
                }
            });
        }
    });
})(jQuery);
