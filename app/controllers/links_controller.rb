class LinksController < DefaultController
  
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
  
  def show
    @link = Link[params[:id]]
	@comment = @link.comments.build
  end
  
  def create
    @link = Link.new(params[:link])
    if @link.save
      redirect_to(links_show_url(:id => @link))
    else
      render(:action, "new")
    end
  end
  
  def update
    @link = link.get(params[:id])
    if @link.update_attributes(params[:link])
      redirect_to(links_show_url(:id => @link))
    else
      render(:action, "edit")
    end
  end
  
  
  def delete
    @link = Link.get(params[:id])
    @link.destroy
    redirect_to(links_index_url)
  end
  
  def vote
    @link = Link.get!(params[:id])
    @link.vote!
    
    case params[:format]
    when "html"
      redirect_to(links_index_url)
    when "js"
     # render :partial => 
    end

  rescue DataMapper::ObjectNotFoundError
    redirect_to(links_index_url)
  ensure
    redirect_to(links_index_url)
  end
end
