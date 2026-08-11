/** 
* Template Name: VIRAAYA WEDDINGS - Ultra Modern Responsive Bootstrap Educational Html5 Template
* Version: 1.0  
* Template Scripts
**/


jQuery(document).ready(function () {

$('.nav-link.dropdown-toggle').on('click', function (e) {

  if ($(window).width() <= 992) {
    e.preventDefault();
    e.stopPropagation(); // 🔥 important

    var $menu = $(this).next('.dropdown-menu');

    $('.dropdown-menu').not($menu).removeClass('active');
    $menu.toggleClass('active');
  }

});


$(document).on('click', '.view-more-btn', function () {
    var $btn = $(this);
    var $text = $btn.closest('.description-wrapper').find('.description-text');

    $text.toggleClass('expanded');

    $btn.text(
        $text.hasClass('expanded') ? 'View Less' : 'View More'
    );
});


$('.filter-btn').on('click', function () {
  $('.sidebar-mobile-popup').addClass('is-open');
});

$('.filter-btn-close').on('click', function () {
  $('.sidebar-mobile-popup').removeClass('is-open');
});


  /*===============================
  =     1. MENU                   =
  =================================*/

$(".menu-btn").click(function () {
    $(this).toggleClass("on");
    $(".main-navbar").toggleClass('open');

    const img = $(this).find("img");

    let menuSrc = img.data("menu");
    let closeSrc = img.data("close");

    img.attr("src", img.attr("src") === menuSrc ? closeSrc : menuSrc);
});


  $('.search-btn').click(function () {
    $('#search').toggleClass('show');
  });

  $('.close-btn').click(function () {
    $('#search').removeClass('show');
  });

  /*===============================
  =       2. Banner Slide         =
  =================================*/

  $('.slider-banner').slick({
    slidesToShow: 1,  // Shows 3 full slides and part of the 4th
    slidesToScroll: 1,
    dots: true,
    arrows: false,
    prevArrow:"<button type='button' class='prev custom-arrow'><i class='fa-light fa-angle-left'></i></button>",
    nextArrow: "<button type='button' class='next custom-arrow'><i class='fa-light fa-angle-right'></i></button>",
    centerPadding: '50px',  // Space on the sides to show part of the next slide
    autoplay: true,
    autoplaySpeed: 2000,
  });
  
  
  
  
  
$(window).on('load', function () {

    var $slider = $('.stats-slider');

    function initStatsSlider() {

        // if (window.innerWidth < 992) {

            if (!$slider.hasClass('slick-initialized')) {
                $slider.slick({
slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 0,
    speed: 5000,
    cssEase: 'linear',
    pauseOnHover: false,
    variableWidth: true
                });
            }

        // } else {

        //     if ($slider.hasClass('slick-initialized')) {
        //         $slider.slick('unslick');
        //     }

        // }
    }

    initStatsSlider();

    $(window).on('resize', function () {
        initStatsSlider();
    });

});
  
  
  
window.addEventListener('load', function () {

    var $slider = $('.feature-items');

    function initSlider() {
        if (window.innerWidth < 992) {

            if (!$slider.hasClass('slick-initialized')) {
                $slider.slick({
                    slidesToShow: 3.2,
                    slidesToScroll: 1,
                    arrows: false,
                    dots: true,
                    infinite: false,
                    responsive: [
                        {
                            breakpoint: 767,
                            settings: {
                                slidesToShow: 2.2
                            }
                        },
                        {
                            breakpoint: 400,
                            settings: {
                                slidesToShow: 1.5
                            }
                        }
                    ]
                });
            }

        } else {
            if ($slider.hasClass('slick-initialized')) {
                $slider.slick('unslick');
            }
        }
    }

    initSlider();

    window.addEventListener('resize', function () {
        initSlider();
    });

});
  /*===============================
  =    3. Deal Season Slider      =
  =================================*/

var $slider = $('.deal-season-slider');
var slideCount = $slider.children().length;

$slider.on('init afterChange', function(event, slick, currentSlide){

  // sabse pehle remove karo
  $slider.find('.slick-slide').removeClass('custom-slick-center');

  if(slick.options.centerMode){
    // ðŸ‘‰ normal case (centerMode ON)
    $slider.find('.slick-center').addClass('custom-slick-center');
  } else {
    // ðŸ‘‰ jab centerMode OFF (e.g. 3 slides case)
    
    var slidesToShow = slick.options.slidesToShow;
    var current = slick.currentSlide;

    // middle index nikalna
    var centerIndex = current + Math.floor(slidesToShow / 2);

    $slider.find('.slick-slide[data-slick-index="'+centerIndex+'"]').addClass('custom-slick-center');
  }

});

$slider.slick({
  slidesToShow: 3,
  slidesToScroll: 1,
  dots: true,
  arrows: true,
  autoplay: true,
  autoplaySpeed: 2000,

  centerMode: slideCount > 3 ? true : false,
  centerPadding: '0px',

  prevArrow:"<button type='button' class='prev custom-arrow'><i class='fa-light fa-angle-left'></i></button>",
  nextArrow:"<button type='button' class='next custom-arrow'><i class='fa-light fa-angle-right'></i></button>",

  responsive: [
    {
      breakpoint: 1200,
      settings: {
        slidesToShow: 2,
        centerMode: slideCount > 2 ? true : false,
        centerPadding: '60px'
      }
    },
    {
      breakpoint: 992,
      settings: {
        slidesToShow: 1,
        centerMode: slideCount > 1 ? true : false,
         centerPadding: '60px'
      }
    },
    {
      breakpoint: 640,
      settings: {
        slidesToShow: 1,
        centerMode: slideCount > 1 ? true : false,
         centerPadding: '15px'
      }
    }
  ]
});

  /*=====================================
  =     4. Post Wedding images Change   =
  =======================================*/

  $(document).on('click', '.thumb', function () {
    var $thumb = $(this);
    var $card  = $thumb.closest('.wedding-card');
    var $mainImg = $card.find('.mainImg');
    var mainSrc  = $mainImg.attr('src');
    var thumbSrc = $thumb.attr('src');
    // zoom out
    $mainImg.addClass('zoom-out').removeClass('zoom-in');
    setTimeout(function () {

      // swap images
      $mainImg.attr('src', thumbSrc);
      $thumb.attr('src', mainSrc);

      // zoom in
      $mainImg.removeClass('zoom-out').addClass('zoom-in');

    }, 180);
    $card.find('.thumb').removeClass('active');
    $thumb.addClass('active');
  });





  /*===============================
  =     5. Testimonials           =
  =================================*/

  $('.testimonials-slider').slick({
    slidesToShow: 2,
    slidesToScroll: 1,
    dots: true,
    arrows: true,
    autoplay: true,
    centerPadding: '0px',
    autoplaySpeed: 2000,
    prevArrow:"<button type='button' class='prev custom-arrow'><i class='fa-light fa-angle-left'></i></button>",
    nextArrow: "<button type='button' class='next custom-arrow'><i class='fa-light fa-angle-right'></i></button>",
    responsive: [
    {
      breakpoint: 1200, // mobile
      settings: {
        slidesToShow: 1,
      }
    },
    {
      breakpoint: 767, // mobile
      settings: {
        slidesToShow: 1,
        arrows: false,
            centerMode: true,
        centerPadding: '20px'
      }
    }
  ]
  });
  
  
   $('.packages-slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    dots: true,
    arrows: true,
    prevArrow:"<button type='button' class='prev custom-arrow'><i class='fa-light fa-angle-left'></i></button>",
    nextArrow: "<button type='button' class='next custom-arrow'><i class='fa-light fa-angle-right'></i></button>",
    responsive: [
    {
      breakpoint: 992, // mobile
      settings: {
        slidesToShow: 1,
           centerMode: true,
        centerPadding: '60px'
      }
    },
    {
      breakpoint: 767, // mobile
      settings: {
        slidesToShow: 1,
        dots: false,
        arrows: false,
        centerMode: true,
        centerPadding: '10px'
      }
    }
  ]
  });
  
  

  /*===============================
  =     6. Product           =
  =================================*/
  
  
  
  $('.product-slider2').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    dots: false,
    arrows: true,
    autoplay: true,
    centerMode: false,
    variableWidth: false,
    autoplaySpeed: 2000,
    prevArrow:"<button type='button' class='prev custom-arrow'><i class='fa-light fa-angle-left'></i></button>",
    nextArrow:"<button type='button' class='next custom-arrow'><i class='fa-light fa-angle-right'></i></button>",
    responsive: [
      {
        breakpoint: 1400,
        settings: {
          slidesToShow: 2,
          dots: true
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 1,
          dots: true,
          autoplay: false,
        }
      }
    ]
  });

  

function initProductSlider($el) {
  $el.slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    dots: false,
    arrows: true,
    autoplay: true,
    centerMode: false,
    variableWidth: false,
    autoplaySpeed: 2000,
    prevArrow:"<button type='button' class='prev custom-arrow'><i class='fa-light fa-angle-left'></i></button>",
    nextArrow:"<button type='button' class='next custom-arrow'><i class='fa-light fa-angle-right'></i></button>",
    responsive: [
      {
        breakpoint: 1400,
        settings: {
          slidesToShow: 2,
          dots: true
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 2,
          dots: true,
          autoplay: false,
            centerMode: true,
        centerPadding: '30px'
        }
      },
        {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
          dots: true,
          autoplay: false,
            centerMode: true,
        centerPadding: '30px'
        }
      }
    ]
  });
}

$('.tab-pane.active .product-slider').each(function () {
  initProductSlider($(this));
});

$('button[data-bs-toggle="tab"]').on('shown.bs.tab', function (e) {

  var targetTab = $(e.target).data('bs-target');
  var $slider = $(targetTab).find('.product-slider');

  if ($slider.hasClass('slick-initialized')) {
    $slider.slick('unslick');
  }

  initProductSlider($slider);
});

/*===============================
  =    3. Deal Season Slider      =
  =================================*/

  $('.check-hotal-aval-slider').slick({
    slidesToShow: 9,
    slidesToScroll: 1,
    dots: true,
    arrows: true,
    centerMode: true,
    autoplay: true,
    centerPadding: '0px',
    autoplaySpeed: 2000,
    prevArrow:"<button type='button' class='prev custom-arrow'><i class='fa-light fa-angle-left'></i></button>",
    nextArrow: "<button type='button' class='next custom-arrow'><i class='fa-light fa-angle-right'></i></button>",
    responsive: [
    {
      breakpoint: 1200, // mobile
      settings: {
        slidesToShow: 6,
        dots: true
      }
    },
    {
      breakpoint: 992, // mobile
      settings: {
        slidesToShow: 3,
        dots: true
      }
    }
  ]
  });
  
  
  
  
   /*===============================
  =    3. Partner Hotels      =
  =================================*/

  $('.PartnerHotels-slider').slick({
    slidesToShow:4,
    slidesToScroll: 1,
    dots: false,
    arrows: true,
    centerMode: true,
    autoplay: true,
    centerPadding: '0px',
    autoplaySpeed: 2000,
    prevArrow:"<button type='button' class='prev custom-arrow'><i class='fa-light fa-angle-left'></i></button>",
    nextArrow: "<button type='button' class='next custom-arrow'><i class='fa-light fa-angle-right'></i></button>",
     
  });
  
  
  /*===============================
  =      8.scroll in Top          =
  =================================*/

  // show / hide button on scroll
  $(window).scroll(function () {
    if ($(this).scrollTop() > 200) {
      $('#goTop').fadeIn();
    } else {
      $('#goTop').fadeOut();
    }
  });

  // scroll to top on click
  $('#goTop').click(function () {
    $('html, body').animate({
      scrollTop: 0
    }, 600);
    return false;
  });


  $(document).on('click', '.date-input', function () {
    if (this.readOnly || this.disabled || typeof this.showPicker !== 'function') return;
    try {
      this.showPicker();
    } catch (error) {
      // Flatpickr and readonly inputs provide their own picker UI.
    }
  });


AOS.init({
  duration: 1200,
//   disable: 'mobile'
});
  
  
 const accordion = document.querySelector("#weddingFAQ");

  if (!accordion) {
    console.log("Accordion not found");
    return;
  }

  accordion.querySelectorAll(".accordion-collapse").forEach((collapseEl) => {

    collapseEl.addEventListener("show.bs.collapse", function () {
      const item = collapseEl.closest(".accordion-item");
      if (item) item.classList.add("active");
    });

    collapseEl.addEventListener("hide.bs.collapse", function () {
      const item = collapseEl.closest(".accordion-item");
      if (item) item.classList.remove("active");
    });

  });





});
