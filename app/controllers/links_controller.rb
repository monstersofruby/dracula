class LinksController
  include Mack::Controller
  
  # '/'
  # Note: You do not need to actually have an empty action like this defined for Mack to
  # find the view on disk. This is only included here for the sake of 'completeness'.
  def index
    @links = Link.all
    render :action, "index", :layout => 'application'
  end

  def new
    @link = Link.new
  end
  
  def create
    @link = Link.create(params[:link])
  end
  
  
end
