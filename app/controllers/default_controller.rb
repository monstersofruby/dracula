# This controller has been generated so we can give you a 'pretty' and dynamic welcome page.
# You are under no obligation to extend from this controller, as some other frameworks would
# you too. :) If you do decide to extend this controller, you'll be happy to know that it
# will get loaded first, before your other controllers, so it will be present for their use.
class DefaultController
  include Mack::Controller
 
	before_filter :update_sass_stylesheets

  # '/'
  # Note: You do not need to actually have an empty action like this defined for Mack to
  # find the view on disk. This is only included here for the sake of 'completeness'.
  def index
  end


	def update_sass_stylesheets
		unless defined?(Sass::RAILS_LOADED)
			Sass::MACK_LOADED = true

			Sass::Plugin.options.merge!(:template_location  => Mack.paths.public('stylesheets') + '/sass',
													:css_location       => Mack.paths.public('stylesheets'),
													:always_check       => Mack.env != "production",
													:full_exception     => Mack.env != "production")

			if !Sass::Plugin.checked_for_updates ||
					Sass::Plugin.options[:always_update] || Sass::Plugin.options[:always_check]
				Sass::Plugin.update_stylesheets
			end
		end
	end

end
