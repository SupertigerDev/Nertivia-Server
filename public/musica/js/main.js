var logoInScreen = true
var logoHover = false;

function update() {

    var velocity = 0.5;
    var pos = $(window).scrollTop();
    $('header').each(function () {
        var $element = $(this);
        // subtract some from the height b/c of the padding
        var height = $element.height() - 18;
        $(this).css('backgroundPosition', '50% ' + Math.round((height - pos) * velocity) + 'px');
    });
};

$(window).bind('scroll', update);


$(window).bind("load", function () {


    var eTop = $('.headerLogo').offset().top; 
  
    $(window).scroll(function() { 

        
      if(eTop - $(window).scrollTop() <= -273){
          if (logoInScreen == true){
            logoInScreen = false;
            $(".stripLogo").animate({
                marginTop: 0,
                opacity: 1
            }, 200)
          }
      }else{
          if (logoInScreen == false){
              logoInScreen = true;
              $(".stripLogo").animate({
                marginTop: 30,
                opacity: 0
            }, 200)
          }
      }
    });


    $("body").fadeIn()
    $(".headerLogoContainer").css('transform', "scale(1)")



    $(".homeButton").click(function(){
        $(".navButton").removeClass("selectedButton");
        $(".homeButton").addClass("selectedButton");
        window.scroll({top: 0,left: 0,behavior: 'smooth'});
    })


    $(".learnMoreBtn").click(function(){
        $(".navButton").removeClass("selectedButton");
        $(".learnMoreBtn").addClass("selectedButton");
        $([document.documentElement, document.body]).animate({
            scrollTop: $(".informationBoxOne").offset().top - 100
        }, 500);
    })



    $(".sliding-link").click(function(e) {
        e.preventDefault();
        $(".navButton").removeClass("selectedButton");
        $(".membersOnlineButton").addClass("selectedButton");
        var aid = $(this).attr("href");
        $('html,body').animate({scrollTop: $(aid).offset().top - 99} ,'slow');
    });

    $(".ownerAdminButton").click(function(){
        $(".navButton").removeClass("selectedButton");
        $(".ownerAdminButton").addClass("selectedButton");
        $([document.documentElement, document.body]).animate({
            scrollTop: $(".infobox3").offset().top - 100
        }, 500);
    })

    $(".headerLogo").hover(function(){
        logoHover = true;
        timeout()
    })
    $( ".headerLogo" ).mouseout(function() {
        logoHover = false;
    })
    

});

function timeout() {
    $(".headerLogo").css("transform", "scale(1.2)")
    setTimeout(() => {
        $(".headerLogo").css("transform", "scale(1)")
    }, 1000);
    setTimeout(function () {
        
        if (logoHover == false){
            $(".headerLogo").css("transform", "scale(1)")
            return;
        }
        $(".headerLogo").css("transform", "scale(1.2)")
        setTimeout(() => {
            $(".headerLogo").css("transform", "scale(1)")
        }, 1000);
        timeout();
    }, 2000);
}