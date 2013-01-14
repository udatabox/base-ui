(function($, UI){

    function Button(element, options){

        var $this = this;

        this.element = $(element);
        this.options = $.extend({}, options);
        this.hidden  = $('<input type="hidden" name="" value="" />');
        
        if(this.options.active) this.element.addClass("active");

        if(this.options.name){
            this.hidden.attr("name", this.options.name).val($this.element.hasClass("active") ? 1:0);
            this.element.after(this.hidden);
        }

        this.element.on("click", function(e){
            e.preventDefault();
            $this.toggle();
        });
    }
    
    $.extend(Button.prototype, {
        options: {
            active: false,
            name: false
        },

        toggle: function() {
            this.element.toggleClass("active");
            this.hidden.val(this.element.hasClass("active") ? 1:0);
        },

        activate: function(){
            this.element.addClass("active");
            this.hidden.val(1);
        },

        deactivate: function() {
            this.element.removeClass("active");
            this.hidden.val(0);
        },

        val: function() {
            return this.hidden.val();
        }
    });

    function ButtonRadioGroup(element, options) {
        
        var $this    = this, 
            $element = $(element);

        this.options = $.extend({}, this.options, options);
        this.hidden  = $('<input type="hidden" name="" value="" />');

        if(this.options.name){
            this.hidden.attr("name", this.options.name).val(this.options.value);
            $element.after(this.hidden);

            if(this.options.value !== false){
                $element.find(".button[data-value='"+this.options.value+"']:first").addClass("active");
            }
        }

        this.element = $element.on("click", ".button", function(e) {
            e.preventDefault();
            $element.find(".button").not(this).removeClass("active");
            $element.trigger("change", [$(this).addClass("active")]);

            $this.hidden.val($(this).data("value"));
        });
    }

    $.extend(ButtonRadioGroup.prototype, {
        options: {
            name: false,
            value: false
        },

        val: function() {
            return this.hidden.val();
        }
    });

    UI.fn.button     = Button;
    UI.fn.radiogroup = ButtonRadioGroup;

})(jQuery, jQuery.baseui || {});