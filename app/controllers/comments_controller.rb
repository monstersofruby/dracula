class CommentsController < DefaultController
  
	def create
		@comment = @link.comment.build( params[:comment] )
		if (@comment.save)
			redirect_to link_show_url( :id => @link.id )
		else
			render :template => 'links/show'
		end
	end

	protected

	def load_link
		@link = Link[params[:link_id]]
	end

end
