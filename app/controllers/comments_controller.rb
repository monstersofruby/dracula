class CommentsController < DefaultController
 
	before_filter :load_link

	def create
		@comment = @link.comments.build( params[:comment] )
		if (@comment.save)
			redirect_to links_show_url( :id => @link.id )
		else
			render :template => 'links/show'
		end
	end

	protected

	def load_link
		@link = Link[params[:link_id]]
	end

end
